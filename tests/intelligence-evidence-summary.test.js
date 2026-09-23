'use strict';

const assert = require('node:assert/strict');
const { createIntelligenceEvidenceSummary } = require('../src/core/intelligence-evidence-summary');

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
  const result = createIntelligenceEvidenceSummary(base());
  assert.equal(result.schema_version, '1');
  assert.equal(result.validation_result, 'CONFIRMED');
  assert.match(result.summary_id, /^intelligence-summary:v1:[a-f0-9]{64}$/);
}

{
  assert.deepEqual(
    createIntelligenceEvidenceSummary(base()),
    createIntelligenceEvidenceSummary(base()),
  );
}

{
  const input = base();
  const result = createIntelligenceEvidenceSummary(input);
  result.evidence_ids.push('mutated');
  input.intelligence.evidence_ids.push('input-mutated');
  assert.equal(result.evidence_ids.includes('input-mutated'), false);
}

{
  const input = base();
  input.intelligence.formation_id = 'formation:other';
  assert.throws(() => createIntelligenceEvidenceSummary(input), /INTELLIGENCE_FORMATION_ID_MISMATCH/);
}

{
  const input = base();
  input.intelligence.outcome_id = 'outcome:other';
  assert.throws(() => createIntelligenceEvidenceSummary(input), /INTELLIGENCE_OUTCOME_ID_MISMATCH/);
}

{
  const input = base();
  input.intelligence.validation_id = 'validation:other';
  assert.throws(() => createIntelligenceEvidenceSummary(input), /INTELLIGENCE_VALIDATION_ID_MISMATCH/);
}

console.log('6 intelligence evidence summary tests passed');
