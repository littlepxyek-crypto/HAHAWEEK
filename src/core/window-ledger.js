'use strict';

/*
 * Window-watch ledger.
 *
 * Two independent records:
 *
 * 1. Discovery ledger (JSON file, OUTSIDE the evidence epoch, survives epoch
 *    rotation): how far stage 1 has scanned Initialize logs (contiguous, no
 *    gaps), the pools found but not yet ingested, and the highest block any
 *    epoch has fully ingested. It is planning input only, never evidence.
 *
 * 2. Gap table `window_gaps` (inside the evidence DB of the epoch): every
 *    block range stage 2 skipped, written BEFORE the batch that follows it is
 *    processed. Append-only (triggers). Startup reconciliation accepts a
 *    cursor jump only when a gap here covers exactly the skipped range, and
 *    evidence-coverage reads it to report PARTIAL instead of COMPLETE.
 *
 * Gap rows are inserted into the in-memory DB without a separate save: the
 * following batch's own durable commit (processing result / lineage / F-03 /
 * lifecycle saves) writes them to disk before its authority lifecycle can
 * exist, so a durable lifecycle after a gap always has its gap on disk too.
 */

const fs = require('fs');
const path = require('path');

const LEDGER_VERSION = 1;
const GAP_REASON = 'WINDOW_SKIPPED';

const GAP_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS window_gaps (start_block INTEGER NOT NULL, end_block INTEGER NOT NULL, reason TEXT NOT NULL, discovery_scanned INTEGER NOT NULL, before_segment INTEGER NOT NULL, recorded_at TEXT NOT NULL, PRIMARY KEY (start_block, end_block), CHECK (end_block >= start_block), CHECK (before_segment = end_block + 1));',
  "CREATE TRIGGER IF NOT EXISTS window_gaps_no_update BEFORE UPDATE ON window_gaps BEGIN SELECT RAISE(ABORT, 'WINDOW_GAPS_APPEND_ONLY'); END;",
  "CREATE TRIGGER IF NOT EXISTS window_gaps_no_delete BEFORE DELETE ON window_gaps BEGIN SELECT RAISE(ABORT, 'WINDOW_GAPS_APPEND_ONLY'); END;",
];

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function hasGapTable(db) {
  const rows = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'window_gaps'");
  return rows.length > 0 && rows[0].values.length > 0;
}

function ensureGapTable(database) {
  if (!database || !database.db) fail('WINDOW_GAP_DATABASE_REQUIRED');
  if (hasGapTable(database.db)) return false;
  for (const sql of GAP_SCHEMA) database.db.run(sql);
  return true;
}

function recordGap(database, gap, { now = () => new Date().toISOString() } = {}) {
  if (!database || !database.db) fail('WINDOW_GAP_DATABASE_REQUIRED');
  const { startBlock, endBlock } = gap || {};
  if (!Number.isSafeInteger(startBlock) || startBlock < 0 ||
      !Number.isSafeInteger(endBlock) || endBlock < startBlock) {
    fail('WINDOW_GAP_RANGE_INVALID');
  }
  ensureGapTable(database);
  const existing = database.db.exec(
    'SELECT reason FROM window_gaps WHERE start_block = ? AND end_block = ?',
    [startBlock, endBlock]
  );
  if (existing.length && existing[0].values.length) return { inserted: false };
  database.db.run(
    'INSERT INTO window_gaps (start_block, end_block, reason, discovery_scanned, before_segment, recorded_at) VALUES (?, ?, ?, ?, ?, ?)',
    [startBlock, endBlock, gap.reason || GAP_REASON, gap.discoveryScanned ? 1 : 0, endBlock + 1, now()]
  );
  return { inserted: true };
}

function listGaps(database, { fromBlock = 0, toBlock = Number.MAX_SAFE_INTEGER } = {}) {
  if (!database || !database.db) fail('WINDOW_GAP_DATABASE_REQUIRED');
  if (!hasGapTable(database.db)) return [];
  const rows = database.db.exec(
    'SELECT start_block, end_block, reason, discovery_scanned FROM window_gaps WHERE end_block >= ? AND start_block <= ? ORDER BY start_block, end_block',
    [fromBlock, toBlock]
  );
  if (!rows.length) return [];
  return rows[0].values.map(([startBlock, endBlock, reason, discoveryScanned]) => ({
    startBlock, endBlock, reason, discoveryScanned: discoveryScanned === 1,
  }));
}

function hasExactGap(database, startBlock, endBlock) {
  if (!database || !database.db || !hasGapTable(database.db)) return false;
  const rows = database.db.exec(
    'SELECT 1 FROM window_gaps WHERE start_block = ? AND end_block = ? AND reason = ?',
    [startBlock, endBlock, GAP_REASON]
  );
  return rows.length > 0 && rows[0].values.length === 1;
}

/* ---------------- discovery ledger (file) ---------------- */

function emptyLedger(chainId) {
  return {
    version: LEDGER_VERSION,
    chainId,
    scannedFrom: null,
    scannedThrough: null,
    ingestedThrough: null,
    pending: [],
    totals: { discovered: 0, ingested: 0, dropped: 0 },
    updatedAt: null,
  };
}

function loadLedger(file, { chainId }) {
  if (!fs.existsSync(file)) return emptyLedger(chainId);
  let ledger;
  try {
    ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    fail('WINDOW_LEDGER_UNREADABLE');
  }
  if (!ledger || ledger.version !== LEDGER_VERSION) fail('WINDOW_LEDGER_VERSION_INVALID');
  if (ledger.chainId !== chainId) fail('WINDOW_LEDGER_CHAIN_MISMATCH');
  if (!Array.isArray(ledger.pending)) fail('WINDOW_LEDGER_INVALID');
  for (const key of ['scannedFrom', 'scannedThrough', 'ingestedThrough']) {
    if (ledger[key] !== null && !Number.isSafeInteger(ledger[key])) fail('WINDOW_LEDGER_INVALID');
  }
  ledger.totals = { discovered: 0, ingested: 0, dropped: 0, ...(ledger.totals || {}) };
  return ledger;
}

function saveLedger(file, ledger) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ ...ledger, updatedAt: new Date().toISOString() }, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

/*
 * Apply a discovery result. Discovery must continue exactly where the ledger
 * stopped (contiguous). New pools are appended; the pending list is capped,
 * keeping the newest.
 */
function applyDiscovery(ledger, { fromBlock, toBlock, pools }, { pendingMax = 5000 } = {}) {
  if (toBlock === null || toBlock === undefined) return { ...ledger };
  if (!Number.isSafeInteger(fromBlock) || !Number.isSafeInteger(toBlock) || toBlock < fromBlock) {
    fail('WINDOW_LEDGER_DISCOVERY_RANGE_INVALID');
  }
  if (ledger.scannedThrough !== null && fromBlock !== ledger.scannedThrough + 1) {
    fail('WINDOW_LEDGER_DISCOVERY_NOT_CONTIGUOUS');
  }
  const seen = new Set(ledger.pending.map(pool => `${pool.blockNumber}:${pool.poolId}`));
  const pending = [...ledger.pending];
  let added = 0;
  for (const pool of pools) {
    if (pool.blockNumber < fromBlock || pool.blockNumber > toBlock) fail('WINDOW_LEDGER_POOL_OUT_OF_RANGE');
    const key = `${pool.blockNumber}:${pool.poolId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pending.push({ blockNumber: pool.blockNumber, poolId: pool.poolId, transactionHash: pool.transactionHash });
    added += 1;
  }
  pending.sort((a, b) => a.blockNumber - b.blockNumber || String(a.poolId).localeCompare(String(b.poolId)));
  let capped = 0;
  while (pending.length > pendingMax) {
    pending.shift();
    capped += 1;
  }
  return {
    ...ledger,
    scannedFrom: ledger.scannedFrom === null ? fromBlock : ledger.scannedFrom,
    scannedThrough: toBlock,
    pending,
    totals: {
      ...ledger.totals,
      discovered: ledger.totals.discovered + added,
      dropped: ledger.totals.dropped + capped,
    },
  };
}

/*
 * After a pass: pools whose Initialize block lies inside an authorized
 * segment are ingested; pools at or below the cursor that were not covered
 * were skipped (cap or failure) and are dropped from pending.
 */
function settlePending(ledger, { cursor, coveredRanges }) {
  if (cursor === null || cursor === undefined) return { ledger: { ...ledger }, ingested: 0, dropped: 0 };
  const covered = block => coveredRanges.some(range => block >= range.fromBlock && block <= range.toBlock);
  let ingested = 0;
  let dropped = 0;
  const pending = [];
  for (const pool of ledger.pending) {
    if (pool.blockNumber > cursor) pending.push(pool);
    else if (covered(pool.blockNumber)) ingested += 1;
    else dropped += 1;
  }
  return {
    ledger: {
      ...ledger,
      pending,
      ingestedThrough: Math.max(ledger.ingestedThrough ?? -1, cursor),
      totals: {
        ...ledger.totals,
        ingested: ledger.totals.ingested + ingested,
        dropped: ledger.totals.dropped + dropped,
      },
    },
    ingested,
    dropped,
  };
}

module.exports = {
  GAP_REASON,
  LEDGER_VERSION,
  applyDiscovery,
  emptyLedger,
  ensureGapTable,
  hasExactGap,
  listGaps,
  loadLedger,
  recordGap,
  saveLedger,
  settlePending,
};
