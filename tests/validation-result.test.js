'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createValidationResult,
  VALIDATION_RULE_VERSION,
} = require('../src/core/validation-result');

function input(overrides = {}) {
  const formation = {
    formation_id: 'formation:v1:test',
    formation_rule_version: 'pool-bootstrap-v1',
  };
  const outcome = {
    outcome_id: 'outcome:v1:test',
    outcome_rule_version: 'historical-outcome-v1',
    coverage_status: 'COMPLETE',
    evidence_ids: ['ei:future-1'],
  };
  return {
    formation_id: formation.formation_id,
    formation_rule_version: formation.formation_rule_version,
    outcome_id: outcome.outcome_id,
    outcome_rule_version: outcome.outcome_rule_version,
    formation,
    outcome,
    criteria_results: [
      {
        criterion_id: 'C1',
        status: 'PASS',
        evidence_ids: ['ei:future-1'],
        detail: 'criterion satisfied',
      },
    ],
    ...overrides,
  };
}

test('creates deterministic CONFIRMED validation', () => {
  const a = createValidationResult(input());
  const b = createValidationResult(input());
  assert.equal(a.result, 'CONFIRMED');
  assert.equal(a.validation_rule_version, VALIDATION_RULE_VERSION);
  assert.equal(a.validation_id, b.validation_id);
  assert.deepEqual(a.evidence_ids, ['ei:future-1']);
});

test('a failed criterion produces REJECTED', () => {
  const result = createValidationResult(input({
    criteria_results: [{
      criterion_id: 'C1',
      status: 'FAIL',
      evidence_ids: ['ei:future-2'],
    }],
  }));
  assert.equal(result.result, 'REJECTED');
});

test('incomplete historical coverage produces INCONCLUSIVE', () => {
  const result = createValidationResult(input({
    outcome: {
      ...input().outcome,
      coverage_status: 'PARTIAL',
    },
  }));
  assert.equal(result.result, 'INCONCLUSIVE');
});

test('partial coverage cannot be silently rejected by a failed criterion', () => {
  const result = createValidationResult(input({
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

test('an inconclusive criterion produces INCONCLUSIVE', () => {
  const result = createValidationResult(input({
    criteria_results: [{
      criterion_id: 'C1',
      status: 'INCONCLUSIVE',
      evidence_ids: [],
    }],
  }));
  assert.equal(result.result, 'INCONCLUSIVE');
});

test('formation and outcome identity mismatches are rejected', () => {
  assert.throws(
    () => createValidationResult(input({
      outcome_id: 'outcome:v1:other',
    })),
    /OUTCOME_ID_MISMATCH/
  );
  assert.throws(
    () => createValidationResult(input({
      formation_rule_version: 'pool-bootstrap-v2',
    })),
    /FORMATION_RULE_VERSION_MISMATCH/
  );
});
