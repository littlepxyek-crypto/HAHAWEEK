'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createHistoricalOutcome,
  OUTCOME_RULE_VERSION,
} = require('../src/core/historical-outcome');

function input(overrides = {}) {
  return {
    formation_id: 'formation:v1:test',
    formation_rule_version: 'pool-bootstrap-v1',
    formation_end: '2026-01-01T00:00:00.000Z',
    observation_start: '2026-01-01T00:00:00.000Z',
    observation_end: '2026-01-08T00:00:00.000Z',
    observations: [
      {
        evidence_id: 'ei:future-1',
        event_time: '2026-01-02T00:00:00.000Z',
        value: { liquidity: 100 },
      },
    ],
    coverage_status: 'COMPLETE',
    ...overrides,
  };
}

test('creates a deterministic Historical Outcome with provenance', () => {
  const a = createHistoricalOutcome(input());
  const b = createHistoricalOutcome(input());

  assert.equal(a.outcome_rule_version, OUTCOME_RULE_VERSION);
  assert.equal(a.outcome_id, b.outcome_id);
  assert.equal(a.formation_id, 'formation:v1:test');
  assert.deepEqual(a.evidence_ids, ['ei:future-1']);
  assert.deepEqual(a.provenance_reference, { evidence_ids: ['ei:future-1'] });
});

test('Historical Outcome cannot consume observations before formation boundary', () => {
  assert.throws(
    () => createHistoricalOutcome(input({
      observation_start: '2025-12-31T23:00:00.000Z',
    })),
    /OBSERVATION_PRECEDES_FORMATION/
  );
});

test('observation outside the declared historical window is rejected', () => {
  assert.throws(
    () => createHistoricalOutcome(input({
      observations: [{
        evidence_id: 'ei:outside',
        event_time: '2026-01-09T00:00:00.000Z',
      }],
    })),
    /OBSERVATION_OUTSIDE_WINDOW/
  );
});

test('incomplete coverage remains explicit', () => {
  const outcome = createHistoricalOutcome(input({ coverage_status: 'PARTIAL' }));
  assert.equal(outcome.coverage_status, 'PARTIAL');
});

test('conflicting observation windows are rejected', () => {
  assert.throws(
    () => createHistoricalOutcome(input({
      observation_end: '2025-12-31T00:00:00.000Z',
    })),
    /INVALID_OBSERVATION_WINDOW/
  );
});
