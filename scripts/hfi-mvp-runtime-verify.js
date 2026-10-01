'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ethers } = require('ethers');

const { RPC_URL, CHAIN_ID } = require('../src/core/config');
const { createCanonicalEvidence } = require('../src/core/canonical-evidence');
const { hashRawEvidence, hashCanonicalEvidence } = require('../src/core/evidence-identity');
const { createEvidenceGraph } = require('../src/core/evidence-graph');
const { decodeInitializeLog, TOPIC0: INITIALIZE_TOPIC } = require('../src/core/initialize-decoder');
const { createLiquidityEvent, MODIFY_LIQUIDITY_TOPIC } = require('../src/core/liquidity-event');
const { createSwapEvent, SWAP_TOPIC0 } = require('../src/core/swap-event');
const { toFormationEvidence, detectPoolBootstrapFromDecodedEvents } = require('../src/core/hfi-formation-adapter');
const { createHistoricalOutcome } = require('../src/core/historical-outcome');
const { createLiquiditySurvivalCriterion } = require('../src/core/liquidity-survival');
const { createValidationBoundary } = require('../src/core/validation-boundary');
const { createResearchReport } = require('../src/core/research-report');
const { createXContentProjection } = require('../src/core/x-content-projection');

const POOL_MANAGER = '0x8366a39cc670b4001a1121b8f6a443a643e40951';
const CONTRACT_ID = 'HFI-MVP-E2E-V0_1';
const LIQUIDITY_RULE = 'liquidity-survival-hfi-v1';
const SEARCH_BLOCKS = Number(process.env.HFI_SEARCH_BLOCKS || 250000);
const LOG_CHUNK = Number(process.env.HFI_LOG_CHUNK || 10000);
const FORMATION_LOOKAHEAD = Number(process.env.HFI_FORMATION_LOOKAHEAD || 20000);
const RPC_RETRIES = Number(process.env.HFI_RPC_RETRIES || 3);
const RPC_RETRY_DELAY_MS = Number(process.env.HFI_RPC_RETRY_DELAY_MS || 1000);
const rpcFailures = [];

const initIface = new ethers.Interface([
  'event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)'
]);
const liqIface = new ethers.Interface([
  'event ModifyLiquidity(bytes32 indexed id,address indexed sender,int24 tickLower,int24 tickUpper,int256 liquidityDelta,bytes32 salt)'
]);
const swapIface = new ethers.Interface([
  'event Swap(bytes32 indexed id,address indexed sender,int128 amount0,int128 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick,uint24 fee)'
]);

function assertOk(value, message) {
  if (!value) throw new Error(message);
}

function blockTag(number) { return '0x' + Number(number).toString(16); }

function logKey(log) {
  return log.blockHash.toLowerCase() + ':' + log.transactionHash.toLowerCase() + ':' + String(log.logIndex);
}

function logOrder(log) {
  return [Number(BigInt(log.blockNumber)), Number(BigInt(log.transactionIndex || '0x0')), Number(BigInt(log.logIndex || '0x0'))];
}

function compareLogs(a, b) {
  const x = logOrder(a);
  const y = logOrder(b);
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

async function rpc(provider, method, params) {
  let lastError;
  for (let attempt = 1; attempt <= RPC_RETRIES; attempt += 1) {
    try {
      return await provider.send(method, params);
    } catch (error) {
      lastError = error;
      rpcFailures.push({ method, attempt, code: error.code || error.message, message: error.message });
      if (attempt < RPC_RETRIES) await new Promise(function (resolve) { setTimeout(resolve, RPC_RETRY_DELAY_MS * attempt); });
    }
  }
  throw lastError;
}

async function getBlock(provider, number, cache) {
  const key = String(number);
  if (!cache.has(key)) cache.set(key, await rpc(provider, 'eth_getBlockByNumber', [blockTag(number), false]));
  const block = cache.get(key);
  assertOk(block, 'BLOCK_NOT_FOUND');
  return block;
}

async function getTx(provider, hash, cache) {
  const key = hash.toLowerCase();
  if (!cache.has(key)) cache.set(key, await rpc(provider, 'eth_getTransactionByHash', [key]));
  const tx = cache.get(key);
  assertOk(tx, 'TRANSACTION_NOT_FOUND');
  return tx;
}

async function blockTime(provider, number, cache) {
  return Number(BigInt((await getBlock(provider, number, cache)).timestamp));
}

async function getLogsChunked(provider, address, topics, fromBlock, toBlock) {
  const logs = [];
  const requests = [];
  for (let from = fromBlock; from <= toBlock; from += LOG_CHUNK) {
    const to = Math.min(toBlock, from + LOG_CHUNK - 1);
    const params = [{
      address,
      topics,
      fromBlock: blockTag(from),
      toBlock: blockTag(to)
    }];
    const response = await rpc(provider, 'eth_getLogs', params);
    requests.push({ method: 'eth_getLogs', params });
    logs.push(...response);
  }
  return { logs, requests };
}

async function findBlockAtOrAfter(provider, targetTs, low, high, blockCache) {
  let lo = low;
  let hi = high;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const ts = await blockTime(provider, mid, blockCache);
    if (ts >= targetTs) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

async function makeEvidence(provider, log, blockCache, txCache) {
  const blockNumber = Number(BigInt(log.blockNumber));
  const logIndex = Number(BigInt(log.logIndex));
  const tx = await getTx(provider, log.transactionHash, txCache);
  const transactionIndex = Number(BigInt(tx.transactionIndex));
  const eventTime = new Date((await blockTime(provider, blockNumber, blockCache)) * 1000).toISOString();
  const raw = {
    event_id: 'raw:' + CHAIN_ID + ':' + log.blockHash.toLowerCase() + ':' + log.transactionHash.toLowerCase() + ':' + logIndex,
    chain_id: CHAIN_ID,
    block_number: blockNumber,
    block_hash: log.blockHash.toLowerCase(),
    transaction_hash: log.transactionHash.toLowerCase(),
    transaction_index: transactionIndex,
    log_index: logIndex,
    address: log.address.toLowerCase(),
    topics: log.topics.map(function (v) { return v.toLowerCase(); }),
    data: log.data,
    captured_at: new Date().toISOString()
  };
  const canonical = createCanonicalEvidence(raw, { interpretation_status: 'MATCHED' });
  return {
    raw,
    canonical,
    raw_hash: hashRawEvidence(raw),
    canonical_hash: hashCanonicalEvidence(canonical),
    event_time: eventTime,
    observation_time: raw.captured_at,
    rpc_log: log
  };
}

async function findCandidate(provider, initLog, blockCache, txCache) {
  const initBlock = Number(BigInt(initLog.blockNumber));
  const poolId = initLog.topics[1].toLowerCase();
  const latest = await provider.getBlockNumber();
  const formationEnd = Math.min(latest, initBlock + FORMATION_LOOKAHEAD);

  const liq = await getLogsChunked(provider, POOL_MANAGER, [MODIFY_LIQUIDITY_TOPIC, poolId], initBlock, formationEnd);
  const swaps = await getLogsChunked(provider, POOL_MANAGER, [SWAP_TOPIC0, poolId], initBlock, formationEnd);

  const positiveLiquidity = liq.logs.filter(function (log) {
    try {
      return BigInt(liqIface.parseLog({ topics: log.topics, data: log.data }).args.liquidityDelta) > 0n;
    } catch (_) {
      return false;
    }
  }).sort(compareLogs);

  if (!positiveLiquidity.length) return null;

  const firstLiquidity = positiveLiquidity[0];
  const firstSwap = swaps.logs.sort(compareLogs).find(function (log) {
    return compareLogs(firstLiquidity, log) <= 0;
  });
  if (!firstSwap) return null;

  const firstSwapEvidence = await makeEvidence(provider, firstSwap, blockCache, txCache);
  firstSwapEvidence.active_liquidity = swapIface.parseLog({ topics: firstSwap.topics, data: firstSwap.data }).args.liquidity.toString();
  const firstSwapTs = Date.parse(firstSwapEvidence.event_time) / 1000;
  if (Math.floor(Date.now() / 1000) - firstSwapTs < 7 * 86400) return null;

  const endTs = firstSwapTs + 7 * 86400;
  const buckets = Array.from({ length: 7 }, function () { return null; });
  const outcomeRequests = [];
  let lowerBlock = Number(BigInt(firstSwap.blockNumber));

  for (let day = 0; day < 7; day += 1) {
    const dayStartTs = firstSwapTs + day * 86400;
    const dayEndTs = Math.min(endTs, dayStartTs + 86400);
    const dayStartBlock = await findBlockAtOrAfter(provider, dayStartTs, lowerBlock, latest, blockCache);
    const dayEndBlock = await findBlockAtOrAfter(provider, dayEndTs, dayStartBlock, latest, blockCache);
    const dayLogs = await getLogsChunked(provider, POOL_MANAGER, [SWAP_TOPIC0, poolId], dayStartBlock, Math.min(dayEndBlock, latest));
    outcomeRequests.push(...dayLogs.requests);
    const firstDayLog = dayLogs.logs.sort(compareLogs)[0];
    if (!firstDayLog) return null;
    const evidence = await makeEvidence(provider, firstDayLog, blockCache, txCache);
    const parsed = swapIface.parseLog({ topics: firstDayLog.topics, data: firstDayLog.data });
    evidence.active_liquidity = parsed.args.liquidity.toString();
    buckets[day] = evidence;
    lowerBlock = Math.max(dayStartBlock, dayEndBlock);
  }

  if (buckets.some(function (v) { return !v; })) return null;

  return {
    initLog,
    firstLiquidity,
    firstSwap,
    poolId,
    firstSwapEvidence,
    daily: buckets,
    requests: liq.requests.concat(swaps.requests, outcomeRequests)
  };
}

function buildPipeline(candidate, evidenceMap) {
  const pool = { chainId: CHAIN_ID, poolManager: POOL_MANAGER, poolId: candidate.poolId };
  const initEvidence = evidenceMap.get(logKey(candidate.initLog));
  const liqEvidence = evidenceMap.get(logKey(candidate.firstLiquidity));
  const swapEvidence = evidenceMap.get(logKey(candidate.firstSwap));

  const initDecoded = decodeInitializeLog(candidate.initLog);
  const liqDecoded = createLiquidityEvent(candidate.firstLiquidity, pool);
  const swapDecoded = createSwapEvent(candidate.firstSwap, pool);

  const events = [
    {
      eventType: 'POOL_INITIALIZED',
      identity: initEvidence.canonical.evidence_id,
      chainId: CHAIN_ID,
      poolId: candidate.poolId,
      blockNumber: Number(BigInt(candidate.initLog.blockNumber)),
      transactionIndex: Number(BigInt(candidate.initLog.transactionIndex)),
      logIndex: Number(BigInt(candidate.initLog.logIndex)),
      event_time: initEvidence.event_time,
      decoded: initDecoded
    },
    {
      ...liqDecoded,
      identity: liqEvidence.canonical.evidence_id,
      event_time: liqEvidence.event_time
    },
    {
      ...swapDecoded,
      identity: swapEvidence.canonical.evidence_id,
      event_time: swapEvidence.event_time
    }
  ];

  const formationResult = detectPoolBootstrapFromDecodedEvents(events);
  assertOk(formationResult.formation && formationResult.state === 'VALID', 'FORMATION_NOT_VALID');

  const observations = candidate.daily.map(function (e) {
    return {
      evidence_id: e.canonical.evidence_id,
      event_time: e.event_time,
      value: { active_liquidity: e.active_liquidity, pool_id: candidate.poolId }
    };
  });

  const start = formationResult.formation.formation_end;
  const end = new Date(Date.parse(start) + 7 * 86400000).toISOString();
  const historicalOutcome = createHistoricalOutcome({
    formation_id: formationResult.formation.formation_id,
    formation_rule_version: formationResult.formation.formation_rule_version,
    formation_end: start,
    observation_start: start,
    observation_end: end,
    coverage_status: 'COMPLETE',
    observations
  });

  const criterion = createLiquiditySurvivalCriterion({
    rule_version: LIQUIDITY_RULE,
    formation_id: formationResult.formation.formation_id,
    pool_id: candidate.poolId,
    reference_evidence_id: swapEvidence.canonical.evidence_id,
    reference_liquidity: swapEvidence.active_liquidity,
    window_start: historicalOutcome.observation_start,
    window_end: historicalOutcome.observation_end,
    outcome: historicalOutcome
  });

  const validation = createValidationBoundary({
    formation: formationResult.formation,
    outcome: historicalOutcome,
    criteria_results: [criterion],
    uncertainties: []
  });

  const report = createResearchReport({
    formation: formationResult.formation,
    outcome: historicalOutcome,
    validation,
    claims: [
      {
        claim_id: 'pool-bootstrap-observed',
        statement: 'A Pool Bootstrap formation was reconstructed from authoritative Robinhood Mainnet evidence.',
        evidence_ids: formationResult.formation.evidence_ids
      },
      {
        claim_id: 'liquidity-survival-evaluated',
        statement: 'LIQUIDITY_SURVIVAL was evaluated under ' + LIQUIDITY_RULE + '.',
        evidence_ids: criterion.evidence_ids
      }
    ]
  });

  const xContent = createXContentProjection({
    formation: formationResult.formation,
    outcome: historicalOutcome,
    validation,
    claims: report.claims
  });

  const graph = createEvidenceGraph();
  for (const evidence of evidenceMap.values()) graph.projectEvidence(evidence.canonical);
  graph.projectFormation(formationResult.formation);

  return {
    formation: formationResult.formation,
    outcome: historicalOutcome,
    criterion,
    validation,
    report,
    xContent,
    graph: graph.toJSON()
  };
}

async function main() {
  assertOk(CHAIN_ID === 4663, 'INVALID_CHAIN_ID');
  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const blockCache = new Map();
  const txCache = new Map();
  const latest = await provider.getBlockNumber();
  const from = Math.max(0, latest - SEARCH_BLOCKS);

  let initResult;
  let candidate = null;
  const hintedPoolId = process.env.HFI_POOL_ID;
  const hintedInitBlock = process.env.HFI_POOL_INIT_BLOCK ? Number(process.env.HFI_POOL_INIT_BLOCK) : null;
  if (hintedPoolId && hintedInitBlock !== null) {
    initResult = await getLogsChunked(provider, POOL_MANAGER, [INITIALIZE_TOPIC, hintedPoolId.toLowerCase()], hintedInitBlock, hintedInitBlock);
    assertOk(initResult.logs.length > 0, 'HINTED_POOL_INITIALIZE_NOT_FOUND');
    for (const initLog of initResult.logs.sort(compareLogs).reverse()) {
      candidate = await findCandidate(provider, initLog, blockCache, txCache);
      if (candidate) break;
    }
    assertOk(candidate, 'HINTED_POOL_HAS_NO_COMPLETE_SEVEN_DAY_FORMATION');
  } else {
    initResult = await getLogsChunked(provider, POOL_MANAGER, [INITIALIZE_TOPIC], from, latest);
    for (const initLog of initResult.logs.sort(compareLogs).reverse()) {
      candidate = await findCandidate(provider, initLog, blockCache, txCache);
      if (candidate) break;
    }
  }

  assertOk(candidate, 'NO_COMPLETE_SEVEN_DAY_FORMATION_FOUND');

  const neededLogs = [candidate.initLog, candidate.firstLiquidity, candidate.firstSwap].concat(candidate.daily.map(function (e) { return e.rpc_log; }));
  const evidenceMap = new Map();
  for (const log of neededLogs) {
    const key = logKey(log);
    if (!evidenceMap.has(key)) evidenceMap.set(key, await makeEvidence(provider, log, blockCache, txCache));
  }
  for (const e of candidate.daily) {
    const ev = evidenceMap.get(logKey(e.rpc_log));
    ev.active_liquidity = e.active_liquidity;
  }
  evidenceMap.get(logKey(candidate.firstSwap)).active_liquidity = candidate.firstSwapEvidence.active_liquidity;

  const first = buildPipeline(candidate, evidenceMap);
  const second = buildPipeline(candidate, evidenceMap);

  const replay = {
    formation_id_equal: first.formation.formation_id === second.formation.formation_id,
    outcome_id_equal: first.outcome.outcome_id === second.outcome.outcome_id,
    validation_id_equal: first.validation.validation_id === second.validation.validation_id,
    report_id_equal: first.report.report_id === second.report.report_id,
    x_content_equal: JSON.stringify(first.xContent) === JSON.stringify(second.xContent)
  };
  assertOk(Object.values(replay).every(Boolean), 'REPLAY_MISMATCH');

  const manifest = {
    raw_hashes: Array.from(evidenceMap.values()).map(function (e) { return e.raw_hash; }).sort(),
    canonical_hashes: Array.from(evidenceMap.values()).map(function (e) { return e.canonical_hash; }).sort()
  };
  const manifestSha256 = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');

  const artifact = {
    contract_id: CONTRACT_ID,
    contract_version: '0.1',
    commit: process.env.GITHUB_SHA || 'LOCAL',
    chain_id: CHAIN_ID,
    rpc_source: RPC_URL,
    status: 'VERIFIED',
    captured_at: new Date().toISOString(),
    search: { latest_block: latest, from_block: from, initialize_log_count: initResult.logs.length, discovery_requests: initResult.requests.concat(candidate.requests) },
    evidence: Array.from(evidenceMap.values()).map(function (e) {
      return {
        raw: e.raw,
        canonical: e.canonical,
        raw_hash: e.raw_hash,
        canonical_hash: e.canonical_hash,
        event_time: e.event_time,
        observation_time: e.observation_time
      };
    }),
    integrity: { manifest, manifest_sha256: manifestSha256 },
    formation: first.formation,
    historical_outcome: first.outcome,
    liquidity_survival: first.criterion,
    validation: first.validation,
    research_report: first.report,
    x_content: first.xContent,
    evidence_graph: first.graph,
    replay,
    rpc_failures: rpcFailures
  };

  const output = process.env.HFI_OUTPUT || path.join(process.cwd(), 'docs/runtime/hfi-mvp-e2e-latest.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(artifact, null, 2) + '\n');
  console.log(JSON.stringify({
    status: artifact.status,
    formation_id: artifact.formation.formation_id,
    outcome_id: artifact.historical_outcome.outcome_id,
    validation_id: artifact.validation.validation_id,
    report_id: artifact.research_report.report_id,
    liquidity_survival: artifact.liquidity_survival.status,
    replay: artifact.replay,
    manifest_sha256: artifact.integrity.manifest_sha256,
    output
  }, null, 2));
}

main().catch(function (error) {
  const output = process.env.HFI_OUTPUT || path.join(process.cwd(), 'docs/runtime/hfi-mvp-e2e-latest.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ contract_id: CONTRACT_ID, commit: process.env.GITHUB_SHA || 'LOCAL', chain_id: CHAIN_ID, status: 'FAILED', failure: { code: error.code || error.message, message: error.message }, rpc_failures: rpcFailures, captured_at: new Date().toISOString() }, null, 2) + '\n');
  console.error(JSON.stringify({ status: 'FAILED', contract_id: CONTRACT_ID, code: error.code || error.message, message: error.message, rpc_failures: rpcFailures }, null, 2));
  process.exitCode = 1;
});
