'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createValidationBoundary } = require('../src/core/validation-boundary');

function input(overrides = {}) {
  const formation = {
    formation_id: 'formation:v1:test',
    formation_rule_version: 'pool-bootstrap-v1',
    state: 'VALID',
  };
  const outcome = {
    outcome_id: 'outcome:v1:test',
    formation_id: formation.formation_id,
    formation_rule_version: formation.formation_rule_version,
    outcome_rule_version: 'historical-outcome-v1',
    coverage_status: 'COMPLETE',
    evidence_ids: ['ei:future-1'],
  };
  return {
    formation,
    outcome,
    criteria_results: [{
      criterion_id: 'C1',
      status: 'PASS',
      evidence_ids: ['ei:future-1'],
    }],
    ...overrides,
  };
}

test('bridges fixed Formation Result and Historical Outcome into Validation Result', () => {
  const result = createValidationBoundary(input());
  assert.equal(result.formation_id, 'formation:v1:test');
  assert.equal(result.outcome_id, 'outcome:v1:test');
  assert.equal(result.result, 'CONFIRMED');
});

test('rejects a non-VALID formation before validation', () => {
  assert.throws(
    () => createValidationBoundary(input({
      formation: {
        ...input().formation,
        state: 'CANDIDATE',
      },
    })),
    /FORMATION_NOT_VALID/
  );
});

test('rejects outcome linked to a different formation', () => {
  assert.throws(
    () => createValidationBoundary(input({
      outcome: {
        ...input().outcome,
        formation_id: 'formation:v1:other',
      },
    })),
    /OUTCOME_FORMATION_ID_MISMATCH/
  );
});

test('rejects outcome linked to a different formation rule version', () => {
  assert.throws(
    () => createValidationBoundary(input({
      outcome: {
        ...input().outcome,
        formation_rule_version: 'pool-bootstrap-v2',
      },
    })),
    /OUTCOME_FORMATION_RULE_VERSION_MISMATCH/
  );
});

test('preserves validation coverage semantics at the boundary', () => {
  const result = createValidationBoundary(input({
    outcome: {
      ...input().outcome,
      coverage_status: 'PARTIAL',
    },
    criteria_results: [{
      criterion_id: 'C1',
      status: 'FAIL',
      evidence_ids: ['ei:partial'],
    }],
  }));
  assert.equal(result.result, 'INCONCLUSIVE');
});
