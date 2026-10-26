'use strict';

/*
 * Window-watch pass orchestration (HAHAWEEK_MODE=window).
 *
 *   stage 1  discovery: Initialize-only getLogs from the discovery cursor
 *            (contiguous) up to the safe head, at most N blocks per pass;
 *            the ledger file is saved before stage 2 starts.
 *   stage 2  full ingestion of the planned segments through the unchanged
 *            verified processing context -> authority gate -> cursor path
 *            (IngestionEngine.runPlannedSegments), gaps recorded first.
 *   settle   pools at or below the cursor leave the pending list: ingested
 *            when an authorized lifecycle covers their Initialize block,
 *            otherwise dropped (counted, never silently).
 */

const { rpcCall } = require('./rpc-call');
const { getSafeHead } = require('./confirmation');
const { discoverInitializations } = require('./window-discovery');
const { planWindowSegments } = require('./window-plan');
const { applyDiscovery, loadLedger, saveLedger, settlePending } = require('./window-ledger');
const { evaluateEvidenceCoverage } = require('./evidence-coverage');

function highestAuthorizedBlock(database) {
  const rows = database.db.exec(
    "SELECT MAX(to_block) FROM production_authority_lifecycle WHERE state = 'DURABLY_ESTABLISHED'"
  );
  const value = rows.length ? rows[0].values[0][0] : null;
  return Number.isSafeInteger(value) ? value : null;
}

function authorizedRangesFor(database, blocks) {
  if (blocks.length === 0) return [];
  const min = Math.min(...blocks);
  const max = Math.max(...blocks);
  const rows = database.db.exec(
    "SELECT from_block, to_block FROM production_authority_lifecycle WHERE state = 'DURABLY_ESTABLISHED' AND to_block >= ? AND from_block <= ?",
    [min, max]
  );
  return rows.length ? rows[0].values.map(([fromBlock, toBlock]) => ({ fromBlock, toBlock })) : [];
}

function createWindowPlanner({ getLedger, database, settings }) {
  return ({ cursor, safeHead }) => {
    const ledger = getLedger();
    const floor = Math.max(ledger.ingestedThrough ?? -1, highestAuthorizedBlock(database) ?? -1);
    return planWindowSegments({
      cursor,
      floor: floor >= 0 ? floor : null,
      safeHead,
      discoveryScannedThrough: ledger.scannedThrough,
      pendingPools: ledger.pending,
      segmentBlocks: settings.WINDOW_SEGMENT_BLOCKS,
      maxPools: settings.WINDOW_MAX_POOLS_PER_PASS,
      latestBlocks: settings.WINDOW_LATEST_BLOCKS,
      batchBlocks: settings.WINDOW_BATCH_BLOCKS,
    });
  };
}

async function runDiscovery({ provider, ledger, settings, budget, now = Date.now }) {
  const startedAt = now();
  const latestBlock = await rpcCall(() => provider.getBlockNumber(), { budget });
  const safeHead = getSafeHead(latestBlock, settings.CONFIRMATIONS);
  const fromBlock = ledger.scannedThrough !== null
    ? ledger.scannedThrough + 1
    : Math.max(0, safeHead - settings.DISCOVERY_INITIAL_LOOKBACK_BLOCKS + 1);
  const result = await discoverInitializations({
    provider,
    fromBlock,
    toBlock: safeHead,
    chunkBlocks: settings.DISCOVERY_CHUNK_BLOCKS,
    minChunkBlocks: settings.DISCOVERY_MIN_CHUNK_BLOCKS,
    maxBlocks: settings.DISCOVERY_MAX_BLOCKS_PER_PASS,
    budget,
  });
  const next = result.scannedThrough === null
    ? ledger
    : applyDiscovery(ledger, { fromBlock, toBlock: result.scannedThrough, pools: result.pools }, {
      pendingMax: settings.WINDOW_PENDING_MAX,
    });
  return {
    ledger: next,
    stats: {
      fromBlock,
      scannedThrough: result.scannedThrough,
      safeHead,
      blocks: result.scannedThrough === null ? 0 : result.scannedThrough - fromBlock + 1,
      pools: result.pools.length,
      requests: result.requests,
      halvings: result.halvings,
      lagBlocks: result.scannedThrough === null ? null : safeHead - result.scannedThrough,
      ms: now() - startedAt,
      error: result.error ? (result.error.code || result.error.message) : null,
    },
    error: result.error,
  };
}

async function runWindowPass({
  engine,
  ledgerFile,
  settings,
  createBudget,
  log = console.log,
  now = Date.now,
}) {
  const { database, provider, ingestion } = engine;
  let ledger = loadLedger(ledgerFile, { chainId: settings.CHAIN_ID });

  // Stage 1.
  const budget = createBudget();
  const discovery = await runDiscovery({ provider, ledger, settings, budget, now });
  ledger = discovery.ledger;
  saveLedger(ledgerFile, ledger);
  log(
    `HAHAWEEK WINDOW DISCOVERY: blocks ${discovery.stats.fromBlock}-${discovery.stats.scannedThrough ?? '-'}` +
    ` (${discovery.stats.blocks}) pools=${discovery.stats.pools} requests=${discovery.stats.requests}` +
    ` halvings=${discovery.stats.halvings} lag=${discovery.stats.lagBlocks ?? '-'} ms=${discovery.stats.ms}` +
    (discovery.stats.error ? ` error=${discovery.stats.error}` : '')
  );
  if (discovery.error && discovery.stats.scannedThrough === null && ledger.scannedThrough === null) {
    throw discovery.error;
  }

  // Stage 2.
  engine.setWindowPlanner(createWindowPlanner({ getLedger: () => ledger, database, settings }));
  let result = null;
  let stageError = null;
  const stageStartedAt = now();
  try {
    result = await ingestion.runOnce();
  } catch (error) {
    stageError = error;
  }
  const stageMs = now() - stageStartedAt;

  // Settle the pending list against what is durably authorized.
  const cursor = ingestion.cursor.get();
  const settled = settlePending(ledger, {
    cursor,
    coveredRanges: authorizedRangesFor(database, ledger.pending.map(pool => pool.blockNumber)),
  });
  ledger = settled.ledger;
  saveLedger(ledgerFile, ledger);

  if (stageError) throw stageError;

  let latestCoverage = null;
  if (result && Number.isInteger(result.horizon) && Number.isInteger(cursor)) {
    const from = Math.max(0, result.horizon - settings.WINDOW_LATEST_BLOCKS + 1);
    latestCoverage = evaluateEvidenceCoverage({ database, fromBlock: from, toBlock: result.horizon }).status;
  }

  return {
    ...result,
    discovery: discovery.stats,
    stageMs,
    pools: {
      selected: result && result.plan ? result.plan.selectedPools.length : 0,
      deferred: result && result.plan ? result.plan.deferredPools.length : 0,
      ingested: settled.ingested,
      dropped: settled.dropped,
      pending: ledger.pending.length,
    },
    latestCoverage,
  };
}

module.exports = {
  createWindowPlanner,
  highestAuthorizedBlock,
  runDiscovery,
  runWindowPass,
};
