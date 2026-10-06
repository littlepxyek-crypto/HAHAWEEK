'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createEngine } = require('../src/index');
const { decodeInitializeLog, TOPIC0: INITIALIZE_TOPIC0 } = require('../src/core/initialize-decoder');
const { MODIFY_LIQUIDITY_TOPIC } = require('../src/core/liquidity-event');
const { createCandidateRadarRecord } = require('../src/core/hfi-radar-candidate');
const { POOL_MANAGER, CHAIN_ID } = require('../src/core/pool-discovery');

const INTERVAL_MS = Number(process.env.HFI_RADAR_INTERVAL_MS || 5000);
const MAX_BACKOFF_MS = Number(process.env.HFI_RADAR_MAX_BACKOFF_MS || 60000);
const MAX_CYCLES = process.env.HFI_RADAR_MAX_CYCLES == null ? Infinity : Number(process.env.HFI_RADAR_MAX_CYCLES);
const MAX_CONSECUTIVE_FAILURES = Number(process.env.HFI_RADAR_MAX_CONSECUTIVE_FAILURES || 3);
const STATE_FILE = process.env.HFI_RADAR_RUNTIME_STATE || path.join(process.cwd(), 'docs/runtime/hfi-radar-continuous-state.json');
const OUTPUT_FILE = process.env.HFI_RADAR_RUNTIME_OUTPUT || path.join(process.cwd(), 'docs/runtime/hfi-radar-live-latest.json');

function assertConfig() {
  if (!Number.isInteger(INTERVAL_MS) || INTERVAL_MS < 0) throw new Error('INVALID_HFI_RADAR_INTERVAL_MS');
  if (!Number.isInteger(MAX_BACKOFF_MS) || MAX_BACKOFF_MS < INTERVAL_MS) throw new Error('INVALID_HFI_RADAR_MAX_BACKOFF_MS');
  if (!(MAX_CYCLES === Infinity || (Number.isInteger(MAX_CYCLES) && MAX_CYCLES > 0))) throw new Error('INVALID_HFI_RADAR_MAX_CYCLES');
  if (!Number.isInteger(MAX_CONSECUTIVE_FAILURES) || MAX_CONSECUTIVE_FAILURES <= 0) throw new Error('INVALID_HFI_RADAR_MAX_CONSECUTIVE_FAILURES');
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function atomicWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

function normalizeState(value) {
  const state = value && typeof value === 'object' ? value : {};
  const pools = {};
  for (const [rawPoolId, rawPool] of Object.entries(state.pools && typeof state.pools === 'object' ? state.pools : {})) {
    const poolId = String(rawPoolId).toLowerCase();
    const seen = new Set();
    const events = [];
    for (const item of Array.isArray(rawPool?.events) ? rawPool.events : []) {
      if (!item || item.evidence_id == null || seen.has(item.evidence_id)) continue;
      seen.add(item.evidence_id);
      events.push(item);
    }
    events.sort(sortEvent);
    pools[poolId] = { events };
  }
  return {
    schema_version: 'hfi-radar-continuous-runtime-v1',
    pools,
    emitted: state.emitted && typeof state.emitted === 'object' ? state.emitted : {},
    cycles_completed: Number.isInteger(state.cycles_completed) ? state.cycles_completed : 0,
    updated_at: state.updated_at || null,
  };
}

function sortEvent(a, b) {
  return (a.block_number - b.block_number) ||
    (a.transaction_index - b.transaction_index) ||
    (a.log_index - b.log_index);
}

function rowToCanonical(row) {
  return { evidence_id: row[0], canonical_json: JSON.parse(row[1]) };
}

function eventFromCanonical(canonical, eventType, eventTime, poolId) {
  return {
    event_type: eventType,
    evidence_id: canonical.evidence_id,
    chain_id: CHAIN_ID,
    pool_id: poolId,
    block_number: canonical.canonical_json.location.block_number,
    transaction_index: canonical.canonical_json.location.transaction_index ?? 0,
    log_index: canonical.canonical_json.location.log_index,
    event_time: eventTime,
  };
}

async function canonicalEventsForResult({ database, provider, processingContext }) {
  const ids = processingContext?.canonicalEvidenceIds || [];
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = database.db.exec(
    `SELECT evidence_id, canonical_json FROM canonical_evidence WHERE evidence_id IN (${placeholders})`,
    ids
  );
  const records = rows.length ? rows[0].values.map(rowToCanonical) : [];
  const blockTimes = new Map();
  async function blockTime(block) {
    if (blockTimes.has(block)) return blockTimes.get(block);
    const header = await provider.getBlock(block);
    if (!header || header.timestamp == null) throw new Error('RADAR_BLOCK_TIMESTAMP_UNAVAILABLE');
    const iso = new Date(Number(header.timestamp) * 1000).toISOString();
    blockTimes.set(block, iso);
    return iso;
  }

  const out = [];
  for (const record of records) {
    const c = record.canonical_json;
    if (c.contract_address?.toLowerCase() !== POOL_MANAGER.toLowerCase()) continue;
    if (c.topics?.[0]?.toLowerCase() !== INITIALIZE_TOPIC0.toLowerCase()) continue;
    const decoded = decodeInitializeLog({
      address: c.contract_address,
      topics: c.topics,
      data: c.data,
      blockNumber: c.location.block_number,
      blockHash: c.location.block_hash,
      transactionHash: c.location.transaction_hash,
      transactionIndex: c.location.transaction_index,
      index: c.location.log_index,
    });
    out.push({
      type: 'POOL_CREATED',
      evidence_id: record.evidence_id,
      pool_id: decoded.poolId.toLowerCase(),
      event: eventFromCanonical(record, 'POOL_CREATED', await blockTime(c.location.block_number), decoded.poolId.toLowerCase()),
    });
  }

  for (const record of records) {
    const c = record.canonical_json;
    if (c.contract_address?.toLowerCase() !== POOL_MANAGER.toLowerCase()) continue;
    if (c.topics?.[0]?.toLowerCase() !== MODIFY_LIQUIDITY_TOPIC.toLowerCase()) continue;
    const poolId = String(c.topics[1]).toLowerCase();
    out.push({
      type: 'LIQUIDITY_ADDED',
      evidence_id: record.evidence_id,
      pool_id: poolId,
      event: eventFromCanonical(record, 'LIQUIDITY_ADDED', await blockTime(c.location.block_number), poolId),
    });
  }
  return out.sort((a, b) => sortEvent(a.event, b.event));
}

function reconcileEmittedCandidates(state) {
  const valid = {};
  for (const pool of Object.values(state.pools)) {
    const candidateEvents = (pool.events || []).filter(e =>
      e.event_type === 'POOL_CREATED' || e.event_type === 'LIQUIDITY_ADDED'
    );
    if (!candidateEvents.some(e => e.event_type === 'POOL_CREATED')) continue;
    if (!candidateEvents.some(e => e.event_type === 'LIQUIDITY_ADDED')) continue;
    const candidate = createCandidateRadarRecord({ events: candidateEvents });
    if (state.emitted[candidate.radar_id]) valid[candidate.radar_id] = true;
  }
  state.emitted = valid;
}

function removeReorgedState(state, fromBlock, toBlock) {
  for (const [poolId, pool] of Object.entries(state.pools)) {
    const events = [...(pool.events || [])].filter(e => e.block_number < fromBlock || e.block_number > toBlock);
    if (!events.length) delete state.pools[poolId];
    else state.pools[poolId] = { events };
  }
  reconcileEmittedCandidates(state);
}

function applyEvents(state, events) {
  const emitted = [];
  for (const item of events) {
    const poolId = String(item.pool_id).toLowerCase();
    const pool = state.pools[poolId] || { events: [] };
    if (!pool.events.some(e => e.evidence_id === item.evidence_id)) pool.events.push(item.event);
    pool.events.sort(sortEvent);
    state.pools[poolId] = pool;

    const candidateEvents = pool.events.filter(e => e.event_type === 'POOL_CREATED' || e.event_type === 'LIQUIDITY_ADDED');
    if (candidateEvents.some(e => e.event_type === 'POOL_CREATED') && candidateEvents.some(e => e.event_type === 'LIQUIDITY_ADDED')) {
      const candidate = createCandidateRadarRecord({ events: candidateEvents });
      if (!state.emitted[candidate.radar_id]) {
        state.emitted[candidate.radar_id] = true;
        emitted.push(candidate);
      }
    }
  }
  return emitted;
}

async function runCycle({ engine, state }) {
  const result = await engine.ingestion.runOnce();
  if (result.processingContext?.transitionType === 'REORG_REPLACEMENT') {
    removeReorgedState(state, result.processingContext.fromBlock, result.processingContext.toBlock);
  }
  const events = await canonicalEventsForResult({
    database: engine.database,
    provider: engine.provider,
    processingContext: result.processingContext,
  });
  const candidates = applyEvents(state, events);
  state.cycles_completed += 1;
  state.updated_at = new Date().toISOString();
  atomicWrite(STATE_FILE, state);
  atomicWrite(OUTPUT_FILE, {
    schema_version: 'hfi-radar-continuous-runtime-v1',
    state: 'ACTIVE_OBSERVATION',
    chain_id: CHAIN_ID,
    pool_manager: POOL_MANAGER,
    source: 'HAHAWEEK_CANONICAL_EVIDENCE',
    processing: {
      from_block: result.processingContext?.fromBlock ?? null,
      to_block: result.processingContext?.toBlock ?? null,
      transition_type: result.processingContext?.transitionType ?? null,
      generation: result.processingContext?.generation ?? null,
      evidence_set_digest: result.processingContext?.evidenceSetDigest ?? null,
    },
    candidates,
    candidate_count: candidates.length,
    updated_at: state.updated_at,
  });
  return result;
}

async function runContinuous({
  intervalMs = INTERVAL_MS,
  maxBackoffMs = MAX_BACKOFF_MS,
  maxCycles = MAX_CYCLES,
  output = console.log,
} = {}) {
  assertConfig();
  const engine = await createEngine();
  const state = normalizeState(readJson(STATE_FILE, {}));
  let stopping = false;
  let cycles = 0;
  let backoff = intervalMs;
  let consecutiveFailures = 0;
  const stop = () => { stopping = true; };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    while (!stopping && cycles < maxCycles) {
      try {
        output(`HFI-RADAR LIVE: cycle ${cycles + 1}`);
        await runCycle({ engine, state });
        cycles += 1;
        consecutiveFailures = 0;
        backoff = intervalMs;
        if (stopping || cycles >= maxCycles) break;
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error) {
        consecutiveFailures += 1;
        output(`HFI-RADAR LIVE: cycle failed: ${error.message}`);
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          throw new Error('HFI_RADAR_CONSECUTIVE_FAILURE_LIMIT');
        }
        if (stopping) break;
        await new Promise(resolve => setTimeout(resolve, backoff));
        backoff = Math.min(Math.max(intervalMs, backoff * 2), maxBackoffMs);
      }
    }
    return { cycles, state };
  } finally {
    engine.database.close();
    engine.writerFence.release();
    engine.provider.destroy();
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}

if (require.main === module) {
  runContinuous().catch(error => {
    console.error('HFI-RADAR LIVE: FAILED');
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

module.exports = { canonicalEventsForResult, applyEvents, removeReorgedState, normalizeState, runCycle, runContinuous };
