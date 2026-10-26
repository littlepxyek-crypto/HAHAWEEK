'use strict';

/*
 * Evidence coverage of a block range in one evidence DB (one epoch).
 *
 *   COMPLETE  every block lies inside a durably established authority
 *             lifecycle (verified context -> F-03 -> authority);
 *   PARTIAL   every block is either authorized or inside a recorded
 *             window gap (known to be skipped), and at least one is skipped;
 *   UNKNOWN   at least one block is neither: before this epoch, beyond the
 *             cursor, or simply not recorded. Nothing is claimed about it.
 *
 * The result feeds the existing analytical inputs:
 *   acquisition_status (formation-completeness.js): PARTIAL/UNKNOWN make a
 *     formation UNKNOWN / ACQUISITION_INCOMPLETE;
 *   coverage_status (historical-outcome.js, liquidity-survival.js,
 *     validation-result.js): anything but COMPLETE is insufficient;
 *   completed_ranges for acquisition/block-range-coverage.js.
 */

const { listGaps } = require('./window-ledger');
const { evaluateBlockRangeCoverage } = require('../acquisition/block-range-coverage');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function authorizedRanges(database, fromBlock, toBlock) {
  const rows = database.db.exec(
    "SELECT from_block, to_block FROM production_authority_lifecycle WHERE state = 'DURABLY_ESTABLISHED' AND to_block >= ? AND from_block <= ? ORDER BY from_block, to_block",
    [fromBlock, toBlock]
  );
  if (!rows.length) return [];
  return rows[0].values.map(([from, to]) => ({ from, to }));
}

function clip(ranges, fromBlock, toBlock) {
  return ranges
    .map(range => ({ from: Math.max(range.from, fromBlock), to: Math.min(range.to, toBlock) }))
    .filter(range => range.to >= range.from);
}

function union(ranges) {
  const sorted = [...ranges].sort((a, b) => a.from - b.from || a.to - b.to);
  const out = [];
  for (const range of sorted) {
    const last = out[out.length - 1];
    if (last && range.from <= last.to + 1) last.to = Math.max(last.to, range.to);
    else out.push({ ...range });
  }
  return out;
}

function subtract(ranges, holes) {
  let out = ranges.map(range => ({ ...range }));
  for (const hole of holes) {
    const next = [];
    for (const range of out) {
      if (hole.to < range.from || hole.from > range.to) { next.push(range); continue; }
      if (hole.from > range.from) next.push({ from: range.from, to: hole.from - 1 });
      if (hole.to < range.to) next.push({ from: hole.to + 1, to: range.to });
    }
    out = next;
  }
  return out;
}

function count(ranges) {
  return ranges.reduce((sum, range) => sum + (range.to - range.from + 1), 0);
}

function evaluateEvidenceCoverage({ database, fromBlock, toBlock }) {
  if (!database || !database.db) fail('EVIDENCE_COVERAGE_DATABASE_REQUIRED');
  if (!Number.isSafeInteger(fromBlock) || fromBlock < 0 ||
      !Number.isSafeInteger(toBlock) || toBlock < fromBlock) {
    fail('EVIDENCE_COVERAGE_RANGE_INVALID');
  }
  const whole = [{ from: fromBlock, to: toBlock }];
  const authorized = union(clip(authorizedRanges(database, fromBlock, toBlock), fromBlock, toBlock));
  // An authorized lifecycle wins over a gap that overlaps it.
  const gapRanges = listGaps(database, { fromBlock, toBlock })
    .map(gap => ({ from: gap.startBlock, to: gap.endBlock }));
  const skipped = subtract(union(clip(gapRanges, fromBlock, toBlock)), authorized);
  const unknown = subtract(subtract(whole, authorized), skipped);

  const status = unknown.length > 0 ? 'UNKNOWN' : (skipped.length > 0 ? 'PARTIAL' : 'COMPLETE');
  return Object.freeze({
    status,
    fromBlock,
    toBlock,
    authorizedRanges: authorized,
    skippedRanges: skipped,
    unknownRanges: unknown,
    authorizedBlocks: count(authorized),
    skippedBlocks: count(skipped),
    unknownBlocks: count(unknown),
  });
}

/* Inputs for the existing analytical contracts. */
function analyticalCoverageInputs(coverage) {
  if (!coverage || !['COMPLETE', 'PARTIAL', 'UNKNOWN'].includes(coverage.status)) {
    fail('EVIDENCE_COVERAGE_INVALID');
  }
  const blockRange = evaluateBlockRangeCoverage({
    requested_from: coverage.fromBlock,
    requested_to: coverage.toBlock,
    completed_ranges: coverage.authorizedRanges.map(range => ({ from: range.from, to: range.to })),
  });
  return Object.freeze({
    acquisition_status: coverage.status,
    coverage_status: coverage.status,
    block_range_status: blockRange.status,
    completed_ranges: blockRange.completed_ranges,
    gap_at: blockRange.gap_at,
  });
}

module.exports = {
  analyticalCoverageInputs,
  evaluateEvidenceCoverage,
};
