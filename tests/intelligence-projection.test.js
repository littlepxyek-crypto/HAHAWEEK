'use strict';

const assert = require('node:assert/strict');
const {
  createIntelligenceProjection,
} = require('../src/core/intelligence-projection');

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
  const result = createIntelligenceProjection(base());
  assert.equal(result.schema_version, '1');
  assert.equal(result.formation_id, 'formation:pool:1');
  assert.equal(result.validation_result, 'CONFIRMED');
  assert.equal(result.evidence_ids.length, 5);
  assert.match(result.intelligence_id, /^intelligence:v1:[a-f0-9]{64}$/);
}

{
  const first = createIntelligenceProjection(base());
  const second = createIntelligenceProjection(base());
  assert.deepEqual(first, second);
}

{
  const input = base();
  const result = createIntelligenceProjection(input);
  input.formation.evidence_ids.push('mutated');
  assert.equal(result.evidence_ids.includes('mutated'), false);
  result.evidence_ids.push('output-mutation');
  assert.equal(input.formation.evidence_ids.includes('output-mutation'), false);
}

{
  const input = base();
  input.outcome.formation_id = 'formation:other';
  assert.throws(() => createIntelligenceProjection(input), /OUTCOME_FORMATION_ID_MISMATCH/);
}

{
  const input = base();
  input.validation.outcome_id = 'outcome:other';
  assert.throws(() => createIntelligenceProjection(input), /VALIDATION_OUTCOME_ID_MISMATCH/);
}

{
  const input = base();
  input.validation.result = 'UNKNOWN';
  assert.throws(() => createIntelligenceProjection(input), /INVALID_VALIDATION_RESULT/);
}

{
  const input = base();
  input.formation.evidence_ids = ['same', 'same'];
  assert.throws(() => createIntelligenceProjection(input), /EVIDENCE_IDS_DUPLICATE/);
}

console.log('7 intelligence projection tests passed');
