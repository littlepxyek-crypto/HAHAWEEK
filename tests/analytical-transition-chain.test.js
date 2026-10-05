'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAnalyticalTransitionChain,
} = require('../src/core/formation-hypothesis-validation');

function fixture(validationResult = 'CONFIRMED') {
  const formation = {
    formation_id: 'formation:v1:test',
    formation_rule_version: 'pool-bootstrap-v1',
    formation_start: '2026-10-03T00:00:00.000Z',
    formation_end: '2026-10-03T00:02:00.000Z',
    state: 'VALID',
    evidence_ids: ['e:pool', 'e:liquidity', 'e:swap'],
    provenance_reference: { chain_id: 4663, evidence_ids: ['e:pool', 'e:liquidity', 'e:swap'] },
  };
  const hypothesis = {
    hypothesis_id: 'hypothesis:v1:test',
    formation_id: formation.formation_id,
    rule_version: 'hypothesis-v1',
    processing_context_id: 'proc:test',
    temporal_context: { formation_cutoff: formation.formation_end },
    provenance: { formation_id: formation.formation_id },
    evidence_ids: formation.evidence_ids,
    state: 'PROPOSED',
    authority: 'DERIVED',
  };
  const validation = {
    validation_id: 'validation:v2:test',
    formation_id: formation.formation_id,
    formation_rule_version: formation.formation_rule_version,
    validation_rule_version: 'validation-v2',
    result: validationResult,
    evidence_ids: ['e:swap', 'e:outcome'],
    formation_cutoff: formation.formation_end,
    evidence_temporal_context: [
      { evidence_id: 'e:pool', event_time: '2026-10-03T00:00:00.000Z', roles: ['FORMATION'] },
      { evidence_id: 'e:liquidity', event_time: '2026-10-03T00:01:00.000Z', roles: ['FORMATION'] },
      { evidence_id: 'e:swap', event_time: '2026-10-03T00:02:00.000Z', roles: ['FORMATION', 'OUTCOME'] },
      { evidence_id: 'e:outcome', event_time: '2026-10-04T00:02:00.000Z', roles: ['OUTCOME'] },
    ],
    provenance_reference: { formation_id: formation.formation_id, evidence_ids: ['e:swap', 'e:outcome'] },
  };
  return { formation, hypothesis, validation };
}

test('builds deterministic Formation → Hypothesis → Validation transition history', () => {
  const a = buildAnalyticalTransitionChain(fixture());
  const b = buildAnalyticalTransitionChain(fixture());

  assert.equal(a.authority, 'DERIVED');
  assert.deepEqual(a, b);
  assert.deepEqual(a.formation.map(x => [x.previous_state, x.next_state]), [
    ['OBSERVED', 'PARTIAL'],
    ['PARTIAL', 'CANDIDATE'],
    ['CANDIDATE', 'VALID'],
  ]);
  assert.equal(a.formation[1].previous_transition_id, a.formation[0].transition_id);
  assert.equal(a.formation[2].previous_transition_id, a.formation[1].transition_id);
  assert.deepEqual(a.hypothesis.map(x => [x.previous_state, x.next_state]), [['PROPOSED', 'SUPPORTED']]);
  assert.deepEqual(a.validation.map(x => [x.previous_state, x.next_state]), [
    ['PENDING', 'EVALUATING'],
    ['EVALUATING', 'CONFIRMED'],
  ]);
});

test('maps rejected validation to REFUTED without crossing domains', () => {
  const chain = buildAnalyticalTransitionChain(fixture('REJECTED'));
  assert.equal(chain.hypothesis[0].next_state, 'REFUTED');
  assert.equal(chain.validation[1].next_state, 'REJECTED');
  assert.notEqual(chain.hypothesis[0].domain, chain.validation[1].domain);
});

test('maps unavailable validation to UNKNOWN or INCONCLUSIVE explicitly', () => {
  const unknown = buildAnalyticalTransitionChain(fixture('UNKNOWN'));
  const inconclusive = buildAnalyticalTransitionChain(fixture('INCONCLUSIVE'));
  assert.equal(unknown.hypothesis[0].next_state, 'UNKNOWN');
  assert.equal(inconclusive.hypothesis[0].next_state, 'INCONCLUSIVE');
});

test('fails closed on formation/hypothesis mismatch', () => {
  const input = fixture();
  input.hypothesis.formation_id = 'formation:v1:other';
  assert.throws(
    () => buildAnalyticalTransitionChain(input),
    /HYPOTHESIS_FORMATION_ID_MISMATCH/
  );
});

test('fails closed on invalid formation state', () => {
  const input = fixture();
  input.formation.state = 'PARTIAL';
  assert.throws(
    () => buildAnalyticalTransitionChain(input),
    /FORMATION_CHAIN_REQUIRES_VALID/
  );
});
