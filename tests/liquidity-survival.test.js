'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createLiquiditySurvivalCriterion,
  LIQUIDITY_SURVIVAL_RULE_VERSION,
} = require('../src/core/liquidity-survival');

const start = '2026-01-01T00:00:00.000Z';
const end = '2026-01-08T00:00:00.000Z';

function outcome(overrides = {}) {
  const observations = Array.from({ length: 7 }, (_, day) => ({
    evidence_id: `swap-${day}`,
    event_time: `2026-01-0${day + 1}T12:00:00.000Z`,
    value: { active_liquidity: '100', pool_id: '0xpool' },
  }));

  return {
    observation_start: start,
    observation_end: end,
    coverage_status: 'COMPLETE',
    observations,
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    formation_id: 'formation:v1:test',
    pool_id: '0xpool',
    reference_evidence_id: 'swap-0',
    reference_liquidity: '100',
    window_start: start,
    window_end: end,
    outcome: outcome(),
    ...overrides,
  };
}

test('complete seven-day coverage with 50% threshold passes deterministically', () => {
  const a = createLiquiditySurvivalCriterion(input());
  const b = createLiquiditySurvivalCriterion(input());

  assert.equal(a.criterion_id, LIQUIDITY_SURVIVAL_RULE_VERSION);
  assert.equal(a.status, 'PASS');
  assert.deepEqual(a, b);
});

test('complete coverage with one observation below threshold fails', () => {
  const observations = outcome().observations.map((observation, index) => ({
    ...observation,
    value: { ...observation.value, active_liquidity: index === 4 ? '49' : '100' },
  }));

  const result = createLiquiditySurvivalCriterion(input({
    outcome: outcome({ observations }),
  }));

  assert.equal(result.status, 'FAIL');
});

test('exactly 50% threshold passes', () => {
  const observations = outcome().observations.map((observation) => ({
    ...observation,
    value: { ...observation.value, active_liquidity: '50' },
  }));

  const result = createLiquiditySurvivalCriterion(input({
    outcome: outcome({ observations }),
  }));

  assert.equal(result.status, 'PASS');
});

test('missing bucket remains inconclusive', () => {
  const observations = outcome().observations.filter((_, index) => index !== 3);

  const result = createLiquiditySurvivalCriterion(input({
    outcome: outcome({ observations }),
  }));

  assert.equal(result.status, 'INCONCLUSIVE');
  assert.deepEqual(result.detail.missing_buckets, [3]);
});

test('partial coverage remains inconclusive', () => {
  const result = createLiquiditySurvivalCriterion(input({
    outcome: outcome({ coverage_status: 'PARTIAL' }),
  }));

  assert.equal(result.status, 'INCONCLUSIVE');
});

test('reference liquidity must be positive', () => {
  assert.throws(
    () => createLiquiditySurvivalCriterion(input({ reference_liquidity: '0' })),
    /REFERENCE_LIQUIDITY_MUST_BE_POSITIVE/
  );
});

test('window must be exactly seven days by default', () => {
  assert.throws(
    () => createLiquiditySurvivalCriterion(input({
      window_end: '2026-01-07T23:59:59.000Z',
    })),
    /WINDOW_DURATION_MISMATCH/
  );
});

test('future observation outside the window is rejected', () => {
  const observations = outcome().observations.map((observation, index) =>
    index === 6
      ? { ...observation, event_time: '2026-01-09T00:00:00.000Z' }
      : observation
  );

  assert.throws(
    () => createLiquiditySurvivalCriterion(input({
      outcome: outcome({ observations }),
    })),
    /OBSERVATION_OUTSIDE_WINDOW/
  );
});

test('outcome window must match evaluation window', () => {
  assert.throws(
    () => createLiquiditySurvivalCriterion(input({
      outcome: outcome({ observation_start: '2026-01-01T01:00:00.000Z' }),
    })),
    /OUTCOME_WINDOW_MISMATCH/
  );
});

test('observation from another pool is rejected', () => {
  const observations = outcome().observations.map((observation, index) =>
    index === 2
      ? { ...observation, value: { ...observation.value, pool_id: '0xother' } }
      : observation
  );

  assert.throws(
    () => createLiquiditySurvivalCriterion(input({ outcome: outcome({ observations }) })),
    /OBSERVATION_POOL_MISMATCH/
  );
});

test('HFI methodology uses an explicit version without changing default compatibility', () => {
  const result = createLiquiditySurvivalCriterion(input({
    rule_version: 'liquidity-survival-hfi-v1',
  }));

  assert.equal(result.criterion_id, 'liquidity-survival-hfi-v1');
  assert.equal(result.detail.rule_version, 'liquidity-survival-hfi-v1');
  assert.equal(result.status, 'PASS');
});
