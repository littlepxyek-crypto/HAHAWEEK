'use strict';

function evaluateBlockRangeCoverage({ requested_from, requested_to, completed_ranges }) {
  if (!Number.isSafeInteger(requested_from) || !Number.isSafeInteger(requested_to) || requested_to < requested_from) {
    throw new Error('INVALID_REQUESTED_BLOCK_RANGE');
  }
  if (!Array.isArray(completed_ranges)) throw new Error('COMPLETED_RANGES_REQUIRED');

  const invalid_ranges = [];
  const ranges = [];
  for (const range of completed_ranges) {
    if (!range || !Number.isSafeInteger(range.from) || !Number.isSafeInteger(range.to)
      || range.to < range.from || range.from < requested_from || range.to > requested_to) {
      invalid_ranges.push(range ?? null);
      continue;
    }
    ranges.push({ from: range.from, to: range.to });
  }
  ranges.sort((a, b) => a.from - b.from || a.to - b.to);

  let next = requested_from;
  let contiguous_through = requested_from - 1;
  let gap_at = null;
  let overlap = false;
  for (const range of ranges) {
    if (range.from < next) {
      overlap = true;
      continue;
    }
    if (range.from > next) {
      gap_at = next;
      break;
    }
    contiguous_through = range.to;
    next = range.to + 1;
    if (next > requested_to) break;
  }

  const complete = invalid_ranges.length === 0 && !overlap && contiguous_through >= requested_to;
  if (!complete && gap_at === null && next <= requested_to) gap_at = next;
  return Object.freeze({
    status: complete ? 'COMPLETE' : 'PARTIAL',
    requested_from,
    requested_to,
    completed_ranges: ranges,
    range_count: ranges.length,
    contiguous_through,
    gap_at,
    overlap,
    invalid_ranges,
  });
}

function isOutcomeCoverageComplete({
  all_buckets_populated,
  acquisition_status,
  block_range_status,
  window_boundary_reached,
}) {
  return all_buckets_populated === true
    && acquisition_status === 'COMPLETE'
    && block_range_status === 'COMPLETE'
    && window_boundary_reached === true;
}

module.exports = { evaluateBlockRangeCoverage, isOutcomeCoverageComplete };
