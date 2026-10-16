'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateBlockRangeCoverage,
  isOutcomeCoverageComplete,
} = require('../src/acquisition/block-range-coverage');

test('full contiguous acquisition ranges cover the requested block interval', () => {
  const result = evaluateBlockRangeCoverage({
    requested_from: 100,
    requested_to: 109,
    completed_ranges: [{ from: 105, to: 109 }, { from: 100, to: 104 }],
  });
  assert.equal(result.status, 'COMPLETE');
  assert.equal(result.contiguous_through, 109);
  assert.equal(result.gap_at, null);
  assert.equal(result.overlap, false);
});

test('a missing acquisition range remains PARTIAL even when later ranges succeeded', () => {
  const result = evaluateBlockRangeCoverage({
    requested_from: 100,
    requested_to: 109,
    completed_ranges: [{ from: 100, to: 103 }, { from: 106, to: 109 }],
  });
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.contiguous_through, 103);
  assert.equal(result.gap_at, 104);
});

test('empty or failed acquisition evidence cannot establish complete coverage', () => {
  const result = evaluateBlockRangeCoverage({
    requested_from: 100,
    requested_to: 109,
    completed_ranges: [],
  });
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.contiguous_through, 99);
  assert.equal(result.gap_at, 100);
});

test('overlapping or out-of-range completed requests fail closed', () => {
  const overlap = evaluateBlockRangeCoverage({
    requested_from: 100,
    requested_to: 109,
    completed_ranges: [{ from: 100, to: 105 }, { from: 105, to: 109 }],
  });
  assert.equal(overlap.status, 'PARTIAL');
  assert.equal(overlap.overlap, true);

  const outOfRange = evaluateBlockRangeCoverage({
    requested_from: 100,
    requested_to: 109,
    completed_ranges: [{ from: 99, to: 109 }],
  });
  assert.equal(outOfRange.status, 'PARTIAL');
  assert.equal(outOfRange.invalid_ranges.length, 1);
});

test('filled seven-day buckets do not compensate for incomplete acquisition', () => {
  assert.equal(isOutcomeCoverageComplete({
    all_buckets_populated: true,
    acquisition_status: 'COMPLETE',
    block_range_status: 'PARTIAL',
    window_boundary_reached: true,
  }), false);
});

test('a window that has not reached its end cannot be complete', () => {
  assert.equal(isOutcomeCoverageComplete({
    all_buckets_populated: true,
    acquisition_status: 'PARTIAL',
    block_range_status: 'COMPLETE',
    window_boundary_reached: false,
  }), false);
});

test('complete buckets, acquisition, contiguous ranges, and elapsed window are all required', () => {
  assert.equal(isOutcomeCoverageComplete({
    all_buckets_populated: true,
    acquisition_status: 'COMPLETE',
    block_range_status: 'COMPLETE',
    window_boundary_reached: true,
  }), true);
});
