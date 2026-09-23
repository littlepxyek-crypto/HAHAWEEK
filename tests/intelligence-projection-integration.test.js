'use strict';

const assert = require('node:assert/strict');
const { createValidatedIntelligence } = require('../src/core/intelligence-projection-integration');

function base() {
  return {
    formation: {
      formation_id: 'formation:pool:1',
      formation_type: 'POOL_BOOTSTRAP',
      evidence_ids: ['ev-pool', 'ev-liq', 'ev-swap'],
    },
    outcome: {
      outcome_id: 'outcome:1',
      formation_id: 'formation:pool:1',
      evidence_ids: ['ev-outcome'],
    },
    validation: {
      validation_id: 'validation:1',
      formation_id: 'formation:pool:1',
      outcome_id: 'outcome:1',
      result: 'CONFIRMED',
      evidence_ids: ['ev-validation'],
    },
  };
}

{
  const result = createValidatedIntelligence(base());
  assert.match(result.intelligence_id, /^intelligence:v1:[a-f0-9]{64}$/);
  assert.equal(result.validation_result, 'CONFIRMED');
}

{
  const input = base();
  const first = createValidatedIntelligence(input);
  const second = createValidatedIntelligence(input);
  assert.deepEqual(first, second);
}

{
  const input = base();
  const result = createValidatedIntelligence(input);
  input.validation.result = 'REJECTED';
  result.evidence_ids.push('mutated');
  assert.equal(result.validation_result, 'CONFIRMED');
  assert.equal(input.validation.result, 'REJECTED');
}

{
  const input = base();
  input.validation.formation_id = 'formation:other';
  assert.throws(
    () => createValidatedIntelligence(input),
    /VALIDATION_FORMATION_ID_MISMATCH/,
  );
}

{
  const input = base();
  input.validation.outcome_id = 'outcome:other';
  assert.throws(
    () => createValidatedIntelligence(input),
    /VALIDATION_OUTCOME_ID_MISMATCH/,
  );
}

console.log('5 intelligence projection integration tests passed');
