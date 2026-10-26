'use strict';

/*
 * Window-watch planning (pure, no I/O).
 *
 * Given what discovery has scanned and which pools it found, decide which
 * block ranges stage 2 fully ingests in this pass:
 *   - a short segment (default 5 blocks) starting at the Initialize block of
 *     each new pool, newest pools first, at most maxPools of them;
 *   - the latest `latestBlocks` blocks.
 *
 * Rules:
 *   - never plan past min(safeHead, discoveryScannedThrough);
 *   - never plan at or below the floor (the cursor, or what an earlier epoch
 *     already ingested); segments are strictly ascending, non-overlapping;
 *   - overlapping or adjacent ranges are merged, then split into batches of
 *     at most batchBlocks (each batch = one verified processing context);
 *   - every range between two planned batches (and between the cursor and the
 *     first batch) is a gap; gaps are returned so the caller can record them
 *     BEFORE processing the batch that follows them.
 */

function assertInt(value, code, { min = 0, nullable = false } = {}) {
  if (nullable && value === null) return;
  if (!Number.isSafeInteger(value) || value < min) {
    const error = new Error(code);
    error.code = code;
    throw error;
  }
}

function mergeRanges(ranges) {
  const sorted = ranges
    .filter(range => range.toBlock >= range.fromBlock)
    .sort((a, b) => a.fromBlock - b.fromBlock || a.toBlock - b.toBlock);
  const merged = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.fromBlock <= last.toBlock + 1) {
      last.toBlock = Math.max(last.toBlock, range.toBlock);
      for (const reason of range.reasons) if (!last.reasons.includes(reason)) last.reasons.push(reason);
      last.poolCount += range.poolCount;
    } else {
      merged.push({ ...range, reasons: [...range.reasons] });
    }
  }
  return merged;
}

function splitRange(range, batchBlocks) {
  const out = [];
  for (let from = range.fromBlock; from <= range.toBlock; from += batchBlocks) {
    out.push({
      fromBlock: from,
      toBlock: Math.min(range.toBlock, from + batchBlocks - 1),
      reasons: [...range.reasons],
    });
  }
  return out;
}

function planWindowSegments({
  cursor = null,
  floor = null,
  safeHead,
  discoveryScannedThrough,
  pendingPools = [],
  segmentBlocks = 5,
  maxPools = 60,
  latestBlocks = 200,
  batchBlocks = 100,
}) {
  assertInt(cursor, 'WINDOW_PLAN_CURSOR_INVALID', { nullable: true });
  assertInt(floor, 'WINDOW_PLAN_FLOOR_INVALID', { nullable: true });
  assertInt(safeHead, 'WINDOW_PLAN_SAFE_HEAD_INVALID');
  assertInt(discoveryScannedThrough, 'WINDOW_PLAN_DISCOVERY_INVALID', { nullable: true });
  assertInt(segmentBlocks, 'WINDOW_PLAN_SEGMENT_BLOCKS_INVALID', { min: 1 });
  assertInt(maxPools, 'WINDOW_PLAN_MAX_POOLS_INVALID');
  assertInt(latestBlocks, 'WINDOW_PLAN_LATEST_BLOCKS_INVALID');
  assertInt(batchBlocks, 'WINDOW_PLAN_BATCH_BLOCKS_INVALID', { min: 1 });
  if (!Array.isArray(pendingPools)) throw new Error('WINDOW_PLAN_PENDING_INVALID');

  // Nothing is planned beyond what discovery has scanned.
  if (discoveryScannedThrough === null) {
    return { horizon: null, discoveryScannedThrough, segments: [], gaps: [], selectedPools: [], deferredPools: [], droppedPools: [] };
  }
  const horizon = Math.min(safeHead, discoveryScannedThrough);
  // Lowest block that may still be planned (exclusive bound).
  const low = Math.max(cursor ?? -1, floor ?? -1);

  const droppedPools = [];
  const eligible = [];
  for (const pool of pendingPools) {
    assertInt(pool && pool.blockNumber, 'WINDOW_PLAN_POOL_BLOCK_INVALID');
    if (pool.blockNumber <= low) droppedPools.push(pool);
    else if (pool.blockNumber <= horizon) eligible.push(pool);
  }
  // Newest first; ties broken by pool id for determinism.
  eligible.sort((a, b) => b.blockNumber - a.blockNumber || String(a.poolId).localeCompare(String(b.poolId)));
  const selectedPools = eligible.slice(0, maxPools);
  const deferredPools = eligible.slice(maxPools);

  const ranges = [];
  for (const pool of selectedPools) {
    ranges.push({
      fromBlock: pool.blockNumber,
      toBlock: Math.min(horizon, pool.blockNumber + segmentBlocks - 1),
      reasons: ['NEW_POOL'],
      poolCount: 1,
    });
  }
  if (latestBlocks > 0 && horizon > low) {
    ranges.push({
      fromBlock: Math.max(low + 1, horizon - latestBlocks + 1),
      toBlock: horizon,
      reasons: ['LATEST'],
      poolCount: 0,
    });
  }

  const segments = [];
  for (const range of mergeRanges(ranges.filter(range => range.fromBlock > low))) {
    segments.push(...splitRange(range, batchBlocks));
  }

  const gaps = [];
  let previous = cursor;
  for (const segment of segments) {
    if (previous !== null && segment.fromBlock > previous + 1) {
      gaps.push({
        startBlock: previous + 1,
        endBlock: segment.fromBlock - 1,
        reason: 'WINDOW_SKIPPED',
        discoveryScanned: segment.fromBlock - 1 <= discoveryScannedThrough,
        beforeSegment: segment.fromBlock,
      });
    }
    previous = segment.toBlock;
  }

  return { horizon, discoveryScannedThrough, segments, gaps, selectedPools, deferredPools, droppedPools };
}

module.exports = {
  mergeRanges,
  planWindowSegments,
};
