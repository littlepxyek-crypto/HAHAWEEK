'use strict';
const test = require('node:test');

const assert = require('node:assert/strict');
const { createValidatedRadarRecord } = require('../src/core/validated-radar-record');
function base() { return { summary: { summary_id: 'intelligence-summary:v1:abc', intelligence_id: 'intelligence:v1:abc', formation_id: 'formation:1', outcome_id: 'outcome:1', validation_id: 'validation:1', validation_result: 'CONFIRMED', evidence_ids: ['ev-b', 'ev-a'] } }; }
{
  const result = createValidatedRadarRecord(base());
  assert.match(result.radar_id, /^radar:v1:[a-f0-9]{64}$/);
  assert.equal(result.radar_type, 'EARLY_FORMATION');
  assert.equal(result.state, 'VERIFIED');
  assert.equal(result.epistemic_status, 'VALIDATED_ANALYTICAL_OUTPUT');
  assert.equal(result.authority_domain, 'DERIVED_OUTPUT');
  assert.equal(result.verification_scope, 'VALIDATION_RESULT_AND_EVIDENCE_LINKAGE');
}
{
  assert.deepEqual(createValidatedRadarRecord(base()), createValidatedRadarRecord(base()));
}
{
  const input = base(); const result = createValidatedRadarRecord(input);
  input.summary.evidence_ids.push('input-mutated'); result.evidence_ids.push('output-mutated');
  assert.equal(result.evidence_ids.includes('input-mutated'), false);
  assert.equal(input.summary.evidence_ids.includes('output-mutated'), false);
}
{
  const input = base(); input.summary.validation_result = 'INCONCLUSIVE';
  assert.throws(() => createValidatedRadarRecord(input), /RADAR_REQUIRES_CONFIRMED_VALIDATION/);
}
{
  const input = base(); input.summary.evidence_ids = ['ev-a', 'ev-a'];
  assert.throws(() => createValidatedRadarRecord(input), /EVIDENCE_IDS_DUPLICATE/);
}
console.log('5 validated radar record tests passed');

test('radar verification state is explicitly scoped and is not V4 truth authority',()=>{ const result=createValidatedRadarRecord(base()); assert.notEqual(result.authority_domain,'V4_INTEGRITY'); assert.equal(result.epistemic_status,'VALIDATED_ANALYTICAL_OUTPUT'); });
