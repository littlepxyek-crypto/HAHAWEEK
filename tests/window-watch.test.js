'use strict';

/*
 * Window-watch mode (HAHAWEEK_MODE=window): offline tests.
 * No network. The integration part drives createEngine with a fake chain.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

// Evidence modules read HAHAWEEK_DATA_DIR at load time: isolate this file.
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-window-'));
process.env.HAHAWEEK_DATA_DIR = DATA_DIR;
for (const name of ['HAHAWEEK_STATE_FILE', 'HAHAWEEK_DB_FILE', 'HAHAWEEK_RAW_FILE', 'HAHAWEEK_WRITER_FENCE_FILE', 'HAHAWEEK_LEGACY_FREEZE_FILE']) {
  delete process.env[name];
}

const { readConfig } = require('../src/core/config');
const { planWindowSegments, mergeRanges } = require('../src/core/window-plan');
const {
  applyDiscovery, emptyLedger, ensureGapTable, hasExactGap, listGaps, loadLedger, recordGap, saveLedger, settlePending,
} = require('../src/core/window-ledger');
const { discoverInitializations, isLogLimitError, createInitializeFilter } = require('../src/core/window-discovery');
const { resolveEpoch, listEpochs } = require('../src/core/window-retention');
const { evaluateEvidenceCoverage, analyticalCoverageInputs } = require('../src/core/evidence-coverage');
const { reconcileProductionAuthorityLifecycleCursor } = require('../src/core/production-authority-lifecycle-reconciliation');
const { IngestionEngine } = require('../src/core/ingestion');
const { classifyFormationCompleteness } = require('../src/core/formation-completeness');
const { POOL_MANAGER } = require('../src/core/pool-discovery');
const { TOPIC0: INITIALIZE_TOPIC0 } = require('../src/core/initialize-decoder');
const { MODIFY_LIQUIDITY_TOPIC } = require('../src/core/liquidity-event');
const { createDatabase } = require('../src/core/database');
const { agentFor, createRpcRequest } = require('../src/core/rpc');
const { createWindowPlanner } = require('../src/core/window-ingestion');
const pass = require('../src/pass');
const { runWatch } = require('../src/watch');

function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/* ------------------------------ config ------------------------------ */

test('config: mode defaults to contiguous; window settings and validation', () => {
  const base = readConfig({});
  assert.equal(base.MODE, 'contiguous');
  assert.equal(base.HEADER_CONCURRENCY, 2);
  const w = readConfig({ HAHAWEEK_MODE: 'window' });
  assert.equal(w.MODE, 'window');
  assert.equal(w.WINDOW_SEGMENT_BLOCKS, 5);
  assert.equal(w.WINDOW_MAX_POOLS_PER_PASS, 60);
  assert.equal(w.WINDOW_LATEST_BLOCKS, 200);
  assert.equal(w.WINDOW_BATCH_BLOCKS, w.CHUNK_SIZE);
  assert.equal(w.HEADER_CONCURRENCY, 4);
  assert.equal(w.DISCOVERY_CHUNK_BLOCKS, 100000);
  assert.equal(w.DISCOVERY_MAX_BLOCKS_PER_PASS, 1000000);
  assert.equal(w.EPOCH_MAX_AGE_MS, 24 * 3600 * 1000);
  assert.equal(w.EPOCH_MAX_BYTES, 150 * 1024 * 1024);
  assert.equal(w.EPOCH_KEEP_OLD, 1);
  assert.equal(readConfig({ HAHAWEEK_MODE: 'window', HAHAWEEK_HEADER_CONCURRENCY: '3' }).HEADER_CONCURRENCY, 3);
  assert.equal(readConfig({ HAHAWEEK_MODE: 'WINDOW', HAHAWEEK_PROFILE: 'fast' }).CHUNK_SIZE, 500);
  assert.throws(() => readConfig({ HAHAWEEK_MODE: 'gappy' }), /HAHAWEEK_MODE/);
  assert.throws(() => readConfig({ HAHAWEEK_DISCOVERY_CHUNK_BLOCKS: '10', HAHAWEEK_DISCOVERY_MIN_CHUNK_BLOCKS: '20' }), /MIN_CHUNK/);
  assert.throws(() => readConfig({ HAHAWEEK_WINDOW_SEGMENT_BLOCKS: '0' }), /SEGMENT_BLOCKS/);
});

/* ------------------------------ planning ------------------------------ */

const pool = (blockNumber, id = `p${blockNumber}`) => ({ blockNumber, poolId: id, transactionHash: '0x' });

test('plan: 5-block segment per new pool + latest window, gaps between them', () => {
  const plan = planWindowSegments({
    cursor: 999, safeHead: 2000, discoveryScannedThrough: 2000,
    pendingPools: [pool(1100), pool(1500)], segmentBlocks: 5, maxPools: 60, latestBlocks: 200, batchBlocks: 100,
  });
  assert.equal(plan.horizon, 2000);
  assert.deepEqual(plan.segments.map(s => [s.fromBlock, s.toBlock]), [
    [1100, 1104], [1500, 1504], [1801, 1900], [1901, 2000],
  ]);
  assert.deepEqual(plan.gaps.map(g => [g.startBlock, g.endBlock, g.reason, g.discoveryScanned]), [
    [1000, 1099, 'WINDOW_SKIPPED', true], [1105, 1499, 'WINDOW_SKIPPED', true], [1505, 1800, 'WINDOW_SKIPPED', true],
  ]);
});

test('plan: never past what discovery scanned; nothing without discovery', () => {
  const plan = planWindowSegments({
    cursor: 100, safeHead: 5000, discoveryScannedThrough: 1000,
    pendingPools: [pool(998)], latestBlocks: 200, batchBlocks: 1000,
  });
  assert.equal(plan.horizon, 1000);
  assert.ok(plan.segments.every(s => s.toBlock <= 1000));
  assert.deepEqual(plan.segments.map(s => [s.fromBlock, s.toBlock]), [[801, 1000]]);
  const none = planWindowSegments({ cursor: 100, safeHead: 5000, discoveryScannedThrough: null, pendingPools: [pool(200)] });
  assert.equal(none.segments.length, 0);
  assert.equal(none.horizon, null);
});

test('plan: newest maxPools only; older are deferred; at/below floor dropped', () => {
  const pools = [pool(50), ...Array.from({ length: 70 }, (_, i) => pool(1000 + i * 10))];
  const plan = planWindowSegments({
    cursor: 60, safeHead: 100000, discoveryScannedThrough: 100000, pendingPools: pools,
    maxPools: 60, latestBlocks: 0, segmentBlocks: 5, batchBlocks: 100,
  });
  assert.equal(plan.selectedPools.length, 60);
  assert.equal(plan.deferredPools.length, 10);
  assert.deepEqual(plan.droppedPools.map(p => p.blockNumber), [50]);
  assert.equal(Math.min(...plan.selectedPools.map(p => p.blockNumber)), 1100);
  assert.equal(plan.segments.length, 60);
});

test('plan: overlapping/adjacent ranges merge, long ranges split, strictly ascending, floor respected', () => {
  const plan = planWindowSegments({
    cursor: null, floor: 99, safeHead: 1000, discoveryScannedThrough: 1000,
    pendingPools: [pool(100), pool(102), pool(105), pool(990)], segmentBlocks: 5, latestBlocks: 250, batchBlocks: 100,
  });
  assert.deepEqual(plan.segments.map(s => [s.fromBlock, s.toBlock]), [
    [100, 109], [751, 850], [851, 950], [951, 1000],
  ]);
  for (let i = 1; i < plan.segments.length; i += 1) assert.ok(plan.segments[i].fromBlock > plan.segments[i - 1].toBlock);
  assert.equal(plan.gaps.length, 1); // null cursor: no gap before the first segment
  assert.deepEqual(mergeRanges([
    { fromBlock: 1, toBlock: 2, reasons: ['A'], poolCount: 1 },
    { fromBlock: 3, toBlock: 4, reasons: ['B'], poolCount: 1 },
  ]).map(r => [r.fromBlock, r.toBlock, r.reasons.join()]), [[1, 4, 'A,B']]);
});

test('plan: rejects invalid input', () => {
  assert.throws(() => planWindowSegments({ cursor: -1, safeHead: 1, discoveryScannedThrough: 1 }), /CURSOR/);
  assert.throws(() => planWindowSegments({ cursor: 1, safeHead: 10, discoveryScannedThrough: 10, pendingPools: [{ blockNumber: 'x' }] }), /POOL_BLOCK/);
  assert.throws(() => planWindowSegments({ cursor: 1, safeHead: 10, discoveryScannedThrough: 10, batchBlocks: 0 }), /BATCH/);
});

/* ------------------------------ discovery ------------------------------ */

function fakeLogsProvider({ limitAbove = Infinity, failAt = null, poolsAt = [] } = {}) {
  const calls = [];
  return {
    calls,
    async getLogs(filter) {
      calls.push({ ...filter });
      if (failAt !== null && filter.fromBlock <= failAt && failAt <= filter.toBlock) {
        throw new Error('connect ECONNRESET');
      }
      if (filter.toBlock - filter.fromBlock + 1 > limitAbove) {
        const error = new Error('could not coalesce error');
        error.error = { code: -32000, message: 'logs matched by query exceeds limit of 10000' };
        throw error;
      }
      return poolsAt
        .filter(b => b >= filter.fromBlock && b <= filter.toBlock)
        .map(b => ({ blockNumber: b, topics: [INITIALIZE_TOPIC0, '0x' + String(b).padStart(64, '0')], transactionHash: '0xt' }));
    },
  };
}

test('discovery: Initialize topic only on the PoolManager, 100k chunks, 1M cap', async () => {
  const filter = createInitializeFilter();
  assert.equal(filter.address, POOL_MANAGER);
  assert.deepEqual(filter.topics, [INITIALIZE_TOPIC0]);
  assert.ok(!JSON.stringify(filter).includes(MODIFY_LIQUIDITY_TOPIC));
  const provider = fakeLogsProvider({ poolsAt: [5, 150000, 2000000] });
  const result = await discoverInitializations({ provider, fromBlock: 0, toBlock: 5000000 });
  assert.equal(provider.calls.length, 10);
  assert.ok(provider.calls.every(c => c.toBlock - c.fromBlock + 1 === 100000));
  assert.ok(provider.calls.every(c => c.topics.length === 1 && c.topics[0] === INITIALIZE_TOPIC0));
  assert.equal(result.scannedThrough, 999999);
  assert.deepEqual(result.pools.map(p => p.blockNumber), [5, 150000]);
});

test('discovery: halves the chunk on "exceeds limit of 10000" and stays contiguous', async () => {
  const provider = fakeLogsProvider({ limitAbove: 30000, poolsAt: [10, 99999] });
  const result = await discoverInitializations({ provider, fromBlock: 0, toBlock: 99999, chunkBlocks: 100000, minChunkBlocks: 1000 });
  assert.equal(result.halvings, 2); // 100k -> 50k -> 25k
  assert.equal(result.chunkBlocks, 25000);
  assert.equal(result.scannedThrough, 99999);
  const ranges = provider.calls.filter(c => c.toBlock - c.fromBlock + 1 <= 30000);
  for (let i = 1; i < ranges.length; i += 1) assert.equal(ranges[i].fromBlock, ranges[i - 1].toBlock + 1);
  assert.deepEqual(result.pools.map(p => p.blockNumber), [10, 99999]);
  assert.equal(isLogLimitError({ message: 'x', error: { message: 'logs matched by query exceeds limit of 10000' } }), true);
  assert.equal(isLogLimitError(new Error('ECONNRESET')), false);
});

test('discovery: other errors stop at the last completed chunk; min chunk exhausted reports error', async () => {
  const provider = fakeLogsProvider({ failAt: 250000 });
  const result = await discoverInitializations({ provider, fromBlock: 0, toBlock: 1000000 });
  assert.equal(result.scannedThrough, 199999);
  assert.match(String(result.error.message), /ECONNRESET/);
  const tight = await discoverInitializations({
    provider: fakeLogsProvider({ limitAbove: 10 }), fromBlock: 0, toBlock: 1000, chunkBlocks: 1000, minChunkBlocks: 100,
  });
  assert.equal(tight.scannedThrough, null);
  assert.ok(isLogLimitError(tight.error));
});

/* ------------------------------ ledger ------------------------------ */

test('ledger: discovery must be contiguous; pending capped (newest kept); settle ingested vs dropped', () => {
  let ledger = emptyLedger(4663);
  ledger = applyDiscovery(ledger, { fromBlock: 100, toBlock: 200, pools: [pool(150), pool(120)] });
  assert.equal(ledger.scannedFrom, 100);
  assert.equal(ledger.scannedThrough, 200);
  assert.throws(() => applyDiscovery(ledger, { fromBlock: 205, toBlock: 300, pools: [] }), /NOT_CONTIGUOUS/);
  assert.throws(() => applyDiscovery(ledger, { fromBlock: 201, toBlock: 300, pools: [pool(400)] }), /OUT_OF_RANGE/);
  ledger = applyDiscovery(ledger, { fromBlock: 201, toBlock: 300, pools: [pool(250), pool(260)] }, { pendingMax: 3 });
  assert.deepEqual(ledger.pending.map(p => p.blockNumber), [150, 250, 260]);
  assert.equal(ledger.totals.dropped, 1);
  const settled = settlePending(ledger, { cursor: 255, coveredRanges: [{ fromBlock: 250, toBlock: 254 }] });
  assert.equal(settled.ingested, 1);
  assert.equal(settled.dropped, 1);
  assert.deepEqual(settled.ledger.pending.map(p => p.blockNumber), [260]);
  assert.equal(settled.ledger.ingestedThrough, 255);

  const dir = tmpDir('hahaweek-ledger-');
  const file = path.join(dir, 'window', 'discovery-ledger.json');
  saveLedger(file, settled.ledger);
  assert.equal(loadLedger(file, { chainId: 4663 }).scannedThrough, 300);
  assert.throws(() => loadLedger(file, { chainId: 1 }), /CHAIN_MISMATCH/);
});

/* ------------------------------ gaps + coverage ------------------------------ */

async function memoryDatabase() {
  return createDatabase(':memory:');
}

function insertLifecycle(db, from, to) {
  db.run(
    `INSERT INTO production_authority_lifecycle (authority_lifecycle_id,state,segment_id,manifest_digest,checkpoint_digest,generation,cursor_block,binding_digest,processing_result_id,processing_execution_id,lineage_id,canonical_decision_snapshot_id,evidence_set_digest,from_block,to_block,expected_segment_id,expected_manifest_digest,expected_checkpoint_digest,source_id,predecessor_lifecycle_id,replacement_type,establishment_input_digest,committed_at)
     VALUES (?, 'DURABLY_ESTABLISHED', 's', 'm', 'c', '1', ?, 'b', ?, 'x', 'l', 'cds', 'e', ?, ?, 's', 'm', 'c', 'src', NULL, NULL, ?, 't')`,
    [`al-${from}-${to}`, to, `pr-${from}-${to}`, from, to, `d-${from}-${to}`]
  );
}

test('gaps: recorded once, exact lookup only, append-only', async () => {
  const database = await memoryDatabase();
  ensureGapTable(database);
  assert.deepEqual(recordGap(database, { startBlock: 105, endBlock: 299, discoveryScanned: true }), { inserted: true });
  assert.deepEqual(recordGap(database, { startBlock: 105, endBlock: 299, discoveryScanned: true }), { inserted: false });
  assert.equal(hasExactGap(database, 105, 299), true);
  assert.equal(hasExactGap(database, 105, 298), false);
  assert.equal(hasExactGap(database, 104, 299), false);
  assert.deepEqual(listGaps(database).map(g => [g.startBlock, g.endBlock, g.reason, g.discoveryScanned]), [[105, 299, 'WINDOW_SKIPPED', true]]);
  assert.throws(() => database.db.run('UPDATE window_gaps SET end_block = 300'), /APPEND_ONLY/);
  assert.throws(() => database.db.run('DELETE FROM window_gaps'), /APPEND_ONLY/);
  assert.throws(() => recordGap(database, { startBlock: 10, endBlock: 9 }), /RANGE_INVALID/);
});

test('coverage: COMPLETE / PARTIAL / UNKNOWN, fed into acquisition_status and coverage_status', async () => {
  const database = await memoryDatabase();
  ensureGapTable(database);
  insertLifecycle(database.db, 100, 104);
  recordGap(database, { startBlock: 105, endBlock: 299 });
  insertLifecycle(database.db, 300, 304);
  // A stale gap from a failed attempt overlapping a later authorized segment.
  recordGap(database, { startBlock: 305, endBlock: 400 });
  insertLifecycle(database.db, 350, 354);

  assert.equal(evaluateEvidenceCoverage({ database, fromBlock: 100, toBlock: 104 }).status, 'COMPLETE');
  const partial = evaluateEvidenceCoverage({ database, fromBlock: 100, toBlock: 304 });
  assert.equal(partial.status, 'PARTIAL');
  assert.equal(partial.skippedBlocks, 195);
  assert.equal(partial.authorizedBlocks, 10);
  assert.equal(evaluateEvidenceCoverage({ database, fromBlock: 350, toBlock: 354 }).status, 'COMPLETE');
  const unknown = evaluateEvidenceCoverage({ database, fromBlock: 50, toBlock: 104 });
  assert.equal(unknown.status, 'UNKNOWN');
  assert.deepEqual(unknown.unknownRanges, [{ from: 50, to: 99 }]);
  assert.equal(evaluateEvidenceCoverage({ database, fromBlock: 300, toBlock: 500 }).status, 'UNKNOWN');

  const inputs = analyticalCoverageInputs(partial);
  assert.equal(inputs.acquisition_status, 'PARTIAL');
  assert.equal(inputs.coverage_status, 'PARTIAL');
  assert.equal(inputs.block_range_status, 'PARTIAL');
  assert.equal(inputs.gap_at, 105);
  const events = [
    { event_type: 'POOL_CREATED', evidence_id: 'ev1', block_number: 100, transaction_index: 0, log_index: 0 },
    { event_type: 'LIQUIDITY_ADDED', evidence_id: 'ev2', block_number: 100, transaction_index: 1, log_index: 0 },
    { event_type: 'FIRST_SWAP', evidence_id: 'ev3', block_number: 101, transaction_index: 0, log_index: 0 },
  ];
  assert.equal(classifyFormationCompleteness({ events, acquisition_status: inputs.acquisition_status }).state, 'UNKNOWN');
  const complete = analyticalCoverageInputs(evaluateEvidenceCoverage({ database, fromBlock: 100, toBlock: 104 }));
  assert.equal(complete.block_range_status, 'COMPLETE');
  assert.equal(classifyFormationCompleteness({ events, acquisition_status: complete.acquisition_status }).state, 'VALID');
});

/* ------------------------------ reconciliation ------------------------------ */

function lifecycleRows(ranges) {
  return [{
    values: ranges.map(([from, to]) => [
      `al-${from}`, 'DURABLY_ESTABLISHED', `seg-${from}`, `m-${from}`, `c-${from}`, '1', to, `b-${from}`,
      `pr-${from}`, `px-${from}`, `cl-${from}`, `cds-${from}`, `e-${from}`, from, to,
      `seg-${from}`, `m-${from}`, `c-${from}`, 'src', null, 'NONE', 'd', 't',
    ]),
  }];
}

function reconcileFixture(cursorValue, ranges) {
  const advanced = [];
  let current = cursorValue;
  const cursor = { get: () => current, advance: b => { advanced.push(b); current = b; } };
  const database = { db: { exec: () => lifecycleRows(ranges) } };
  const expectedAuthorityFactory = ({ fromBlock, toBlock }) => ({
    status: 'VERIFIED', fromBlock, toBlock, segmentId: `seg-${fromBlock}`, manifestDigest: `m-${fromBlock}`,
    checkpointDigest: `c-${fromBlock}`, generation: '1', cursorBlock: toBlock,
  });
  return { cursor, database, expectedAuthorityFactory, advanced };
}

test('reconciliation: a cursor jump is accepted only over an exactly recorded gap', async (t) => {
  const binding = require('../src/core/f03-authority-binding');
  const record = require('../src/core/f03-production-authority-record');
  t.mock.method(binding, 'assertAuthorityBinding', () => true);
  t.mock.method(record, 'assertProductionAuthority', () => true);
  // Re-require with the mocks in place.
  delete require.cache[require.resolve('../src/core/production-authority-lifecycle-reconciliation')];
  const { reconcileProductionAuthorityLifecycleCursor: reconcile } = require('../src/core/production-authority-lifecycle-reconciliation');

  const ok = reconcileFixture(104, [[100, 104], [300, 304]]);
  const result = reconcile({ ...ok, gapCovers: (s, e) => s === 105 && e === 299 });
  assert.deepEqual(ok.advanced, [304]);
  assert.equal(result.cursor, 304);

  const wrong = reconcileFixture(104, [[100, 104], [300, 304]]);
  assert.throws(() => reconcile({ ...wrong, gapCovers: (s, e) => s === 105 && e === 298 }), /RANGE_GAP/);
  assert.deepEqual(wrong.advanced, []);

  const wider = reconcileFixture(104, [[100, 104], [300, 304]]);
  assert.throws(() => reconcile({ ...wider, gapCovers: (s, e) => s <= 105 && e >= 299 && e - s > 194 }), /RANGE_GAP/);

  const contiguousMode = reconcileFixture(104, [[100, 104], [300, 304]]);
  assert.throws(() => reconcile({ ...contiguousMode }), /RANGE_GAP/);
  assert.throws(() => reconcile({ ...reconcileFixture(1, []), gapCovers: 'yes' }), /GAP_SOURCE_INVALID/);
  delete require.cache[require.resolve('../src/core/production-authority-lifecycle-reconciliation')];
});

/* ------------------------------ engine (fakes) ------------------------------ */

function engineFixture({ segments, horizon = 1000, failRangeAt = null, rejectAt = null, cursorStart = 99 }) {
  const events = [];
  let cursorValue = cursorStart;
  const cursor = {
    get: () => cursorValue,
    advance: b => { events.push(['cursor', b]); cursorValue = b; },
  };
  const engine = new IngestionEngine({
    provider: { getBlockNumber: async () => 1003 },
    cursor,
    confirmations: 3,
    processor: async () => { throw new Error('legacy'); },
    processorRange: async (from, to) => {
      events.push(['process', from, to]);
      if (failRangeAt === from) throw new Error('RPC_UNAVAILABLE');
      return { status: 'VERIFIED', fromBlock: from, toBlock: to, transitionType: 'INITIAL' };
    },
    batchSize: 100,
    authorityGate: ({ fromBlock }) => {
      events.push(['authority', fromBlock]);
      return { status: rejectAt === fromBlock ? 'REJECTED' : 'AUTHORIZED' };
    },
    rangePlanner: async () => ({ horizon, discoveryScannedThrough: horizon, segments }),
    gapRecorder: gap => events.push(['gap', gap.startBlock, gap.endBlock, gap.reason, gap.discoveryScanned]),
    batchCommitter: ({ fromBlock }) => events.push(['commit', fromBlock]),
  });
  return { engine, events, cursor };
}

test('engine: gap recorded BEFORE its segment; commit before cursor; INITIAL after gaps', async () => {
  const f = engineFixture({ segments: [{ fromBlock: 100, toBlock: 104 }, { fromBlock: 300, toBlock: 304 }, { fromBlock: 901, toBlock: 1000 }] });
  const result = await f.engine.runOnce();
  assert.equal(result.mode, 'window');
  assert.equal(result.cursor, 1000);
  assert.deepEqual(f.events, [
    ['process', 100, 104], ['authority', 100], ['commit', 100], ['cursor', 104],
    ['gap', 105, 299, 'WINDOW_SKIPPED', true], ['process', 300, 304], ['authority', 300], ['commit', 300], ['cursor', 304],
    ['gap', 305, 900, 'WINDOW_SKIPPED', true], ['process', 901, 1000], ['authority', 901], ['commit', 901], ['cursor', 1000],
  ]);
  assert.equal(result.gaps.length, 2);
  assert.equal(result.processed, 110);
});

test('engine: cursor unchanged on processing failure and on authority rejection', async () => {
  const failing = engineFixture({ segments: [{ fromBlock: 100, toBlock: 104 }, { fromBlock: 300, toBlock: 304 }], failRangeAt: 300 });
  await assert.rejects(() => failing.engine.runOnce(), /RPC_UNAVAILABLE/);
  assert.equal(failing.cursor.get(), 104);
  assert.ok(!failing.events.some(e => e[0] === 'commit' && e[1] === 300));

  const rejected = engineFixture({ segments: [{ fromBlock: 100, toBlock: 104 }], rejectAt: 100 });
  await assert.rejects(() => rejected.engine.runOnce(), /AUTHORITY_ACCEPTANCE_REQUIRED/);
  assert.equal(rejected.cursor.get(), 99);
  assert.ok(!rejected.events.some(e => e[0] === 'commit' || e[0] === 'cursor'));
});

test('engine: rejects segments overlapping the cursor or beyond the horizon/safe head', async () => {
  await assert.rejects(() => engineFixture({ segments: [{ fromBlock: 99, toBlock: 104 }] }).engine.runOnce(), /OVERLAPS_CURSOR/);
  await assert.rejects(() => engineFixture({ segments: [{ fromBlock: 990, toBlock: 1001 }] }).engine.runOnce(), /ABOVE_SAFE_HEAD/);
  await assert.rejects(() => engineFixture({ horizon: 500, segments: [{ fromBlock: 490, toBlock: 600 }] }).engine.runOnce(), /ABOVE_HORIZON/);
  assert.throws(() => new IngestionEngine({
    provider: {}, cursor: {}, confirmations: 0, processor: () => {}, processorRange: () => {}, batchSize: 1,
    authorityGate: () => {}, rangePlanner: () => {},
  }), /GAP_RECORDER_REQUIRED/);
});

test('window planner uses the ledger, the cursor and the highest authorized block as floor', async () => {
  const database = await memoryDatabase();
  insertLifecycle(database.db, 500, 504);
  const ledger = { ...emptyLedger(4663), scannedThrough: 2000, ingestedThrough: 400, pending: [pool(450), pool(1500)] };
  const planner = createWindowPlanner({
    getLedger: () => ledger,
    database,
    settings: { WINDOW_SEGMENT_BLOCKS: 5, WINDOW_MAX_POOLS_PER_PASS: 60, WINDOW_LATEST_BLOCKS: 10, WINDOW_BATCH_BLOCKS: 100 },
  });
  const plan = planner({ cursor: null, safeHead: 3000 });
  assert.equal(plan.horizon, 2000);
  assert.deepEqual(plan.segments.map(s => [s.fromBlock, s.toBlock]), [[1500, 1504], [1991, 2000]]);
  assert.deepEqual(plan.droppedPools.map(p => p.blockNumber), [450]);
});

/* ------------------------------ retention ------------------------------ */

test('retention: first epoch, rotate by age and by size, keep 1 old, never while STOPPED', () => {
  const root = tmpDir('hahaweek-epochs-');
  const opts = { rootDir: root, maxAgeMs: 1000, maxBytes: 100, keepOld: 1 };
  const first = resolveEpoch({ ...opts, nowMs: 0 });
  assert.equal(first.reason, 'FIRST_EPOCH');
  assert.equal(first.rotated, false);
  assert.equal(resolveEpoch({ ...opts, nowMs: 500 }).epochId, first.epochId);

  const byAge = resolveEpoch({ ...opts, nowMs: 1000 });
  assert.equal(byAge.rotated, true);
  assert.equal(byAge.reason, 'MAX_AGE');
  assert.notEqual(byAge.epochId, first.epochId);

  fs.writeFileSync(path.join(byAge.epochDir, 'hahaweek.sqlite'), Buffer.alloc(200));
  const held = resolveEpoch({ ...opts, nowMs: 1100, isStopped: () => true });
  assert.equal(held.rotated, false);
  assert.equal(held.epochId, byAge.epochId);
  assert.equal(held.reason, 'ROTATION_HELD_BY_STOP_MAX_BYTES');

  const bySize = resolveEpoch({ ...opts, nowMs: 1200 });
  assert.equal(bySize.rotated, true);
  assert.equal(bySize.reason, 'MAX_BYTES');
  assert.deepEqual(bySize.removed, [first.epochId]);
  assert.deepEqual(listEpochs(root), [byAge.epochId, bySize.epochId]);
  assert.ok(fs.existsSync(path.join(byAge.epochDir, 'hahaweek.sqlite')), 'old epoch kept whole');

  const none = resolveEpoch({ ...opts, keepOld: 0, nowMs: 5000 });
  assert.deepEqual(listEpochs(root), [none.epochId]);
  assert.throws(() => resolveEpoch({ rootDir: root, maxAgeMs: 0, maxBytes: 1 }), /MAX_AGE/);
});

/* ------------------------------ pass / watch ------------------------------ */

test('pass: window mode rejects per-file overrides, holds rotation on a STOP, honours the lock', async () => {
  assert.throws(() => pass.prepareWindowEpoch({ env: { HAHAWEEK_STATE_FILE: '/x' } }), /cannot be set in window mode/);

  const epochDir = tmpDir('hahaweek-epochstop-');
  assert.equal(pass.epochStopped(epochDir), false);
  fs.writeFileSync(path.join(epochDir, 'state.json'), JSON.stringify({
    operationalState: 'BLOCKED',
    failure: { failure_class: 'AUTHORITY', failure_code: 'X', retryable: false },
  }));
  assert.equal(pass.epochStopped(epochDir), true);
  fs.writeFileSync(path.join(epochDir, 'state.json'), '{not json');
  assert.equal(pass.epochStopped(epochDir), true);

  const root = tmpDir('hahaweek-lock-');
  const release = pass.acquirePassLock(root, { staleMs: 60000 });
  assert.equal(typeof release, 'function');
  assert.equal(pass.acquirePassLock(root, { staleMs: 60000 }), null);
  const lines = [];
  const code = await pass.runPass({
    argv: [], mode: 'window',
    prepareEpoch: () => ({ epochId: 'e000001-x', epochDir: path.join(root, 'epochs', 'e000001-x'), rotated: false, reason: null, removed: [] }),
    passLock: () => null,
    runMain: async () => { throw new Error('must not run'); },
    getState: () => ({}),
    output: l => lines.push(l), errorOutput: l => lines.push(l),
  });
  assert.equal(code, 0);
  assert.ok(lines.some(l => /holds the lock/.test(l)));
  release();
  assert.notEqual(pass.acquirePassLock(root, { staleMs: 60000 }), null);

  const failClosed = await pass.runPass({
    argv: [], mode: 'window',
    prepareEpoch: () => { throw new Error('EPOCH_POINTER_INVALID'); },
    output: () => {}, errorOutput: () => {},
  });
  assert.equal(failClosed, pass.EXIT_FAIL_CLOSED);
});

test('watch: loops on exit 0, backs off on errors, stops on 78', async () => {
  const codes = [0, 1, 0, 78, 0];
  const sleeps = [];
  const result = await runWatch({
    sleepMs: 10, maxBackoffMs: 40, runOnePass: async () => codes.shift(), sleepFn: async ms => { sleeps.push(ms); }, output: () => {},
  });
  assert.equal(result.outcome, 'FAIL_CLOSED');
  assert.equal(result.passes, 4);
  assert.deepEqual(sleeps, [10, 10, 10]);
});

/* ------------------------------ database / rpc ------------------------------ */

test('database: deferred saves write once at flush (batch boundary)', async () => {
  const dir = tmpDir('hahaweek-defer-');
  const file = path.join(dir, 'hahaweek.sqlite');
  const database = await createDatabase(file);
  database.save();
  const before = database.saveCount();
  const size0 = fs.statSync(file).size;
  database.setDeferredSaves(true);
  ensureGapTable(database);
  recordGap(database, { startBlock: 1, endBlock: 2 });
  database.save();
  database.save();
  assert.equal(database.saveCount(), before);
  assert.equal(database.isDirty(), true);
  database.flush();
  assert.equal(database.saveCount(), before + 1);
  assert.equal(database.isDirty(), false);
  assert.ok(fs.statSync(file).size >= size0);
  database.close();
});

test('rpc: keep-alive agents are used for every request', () => {
  const request = createRpcRequest('https://rpc.example.invalid');
  assert.equal(typeof request.getUrlFunc, 'function');
  assert.equal(agentFor('https://a.example').keepAlive, true);
  assert.equal(agentFor('http://a.example').keepAlive, true);
  assert.notEqual(agentFor('https://a.example'), agentFor('http://a.example'));
});
