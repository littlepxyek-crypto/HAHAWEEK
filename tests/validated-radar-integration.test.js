'use strict';

const assert = require('node:assert/strict');
const { createValidatedRadar } = require('../src/core/validated-radar-integration');

function base() {
  return {
    summary: {
      summary_id: 'intelligence-summary:v1:abc',
      intelligence_id: 'intelligence:v1:abc',
      formation_id: 'formation:1',
      outcome_id: 'outcome:1',
      validation_id: 'validation:1',
      validation_result: 'CONFIRMED',
      evidence_ids: ['ev-a', 'ev-b'],
    },
  };
}

{
  const result = createValidatedRadar(base());
  assert.match(result.radar_id, /^radar:v1:[a-f0-9]{64}$/);
  assert.equal(result.state, 'VERIFIED');
}

{
  assert.deepEqual(createValidatedRadar(base()), createValidatedRadar(base()));
}

{
  const input = base();
  const result = createValidatedRadar(input);
  input.summary.evidence_ids.push('input-mutated');
  result.evidence_ids.push('output-mutated');
  assert.equal(result.evidence_ids.includes('input-mutated'), false);
  assert.equal(input.summary.evidence_ids.includes('output-mutated'), false);
}

{
  const input = base();
  input.summary.validation_result = 'REJECTED';
  assert.throws(() => createValidatedRadar(input), /RADAR_REQUIRES_CONFIRMED_VALIDATION/);
}

console.log('4 validated radar integration tests passed');
