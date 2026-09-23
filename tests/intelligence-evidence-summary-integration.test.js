'use strict';

const assert = require('node:assert/strict');
const { createValidatedEvidenceSummary } = require('../src/core/intelligence-evidence-summary-integration');

function base() {
  return {
    intelligence: {
      intelligence_id: 'intelligence:v1:abc',
      formation_id: 'formation:1',
      outcome_id: 'outcome:1',
      validation_id: 'validation:1',
      validation_result: 'CONFIRMED',
      evidence_ids: ['ev-a', 'ev-b'],
    },
    formation: { formation_id: 'formation:1' },
    outcome: { outcome_id: 'outcome:1' },
    validation: { validation_id: 'validation:1' },
  };
}

{
  const result = createValidatedEvidenceSummary(base());
  assert.match(result.summary_id, /^intelligence-summary:v1:[a-f0-9]{64}$/);
  assert.equal(result.validation_result, 'CONFIRMED');
}

{
  assert.deepEqual(
    createValidatedEvidenceSummary(base()),
    createValidatedEvidenceSummary(base()),
  );
}

{
  const input = base();
  const result = createValidatedEvidenceSummary(input);
  input.intelligence.evidence_ids.push('input-mutated');
  result.evidence_ids.push('output-mutated');
  assert.equal(result.evidence_ids.includes('input-mutated'), false);
  assert.equal(input.intelligence.evidence_ids.includes('output-mutated'), false);
}

{
  const input = base();
  input.outcome.outcome_id = 'outcome:other';
  assert.throws(() => createValidatedEvidenceSummary(input), /INTELLIGENCE_OUTCOME_ID_MISMATCH/);
}

console.log('4 intelligence evidence summary integration tests passed');
