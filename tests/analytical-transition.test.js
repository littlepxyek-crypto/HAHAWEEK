'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DOMAINS,
  DOMAIN_STATES,
  createAnalyticalTransition,
} = require('../src/core/analytical-transition');

const base = {
  entity_id: 'formation:f1',
  previous_state: 'PARTIAL',
  next_state: 'CANDIDATE',
  reason: 'REQUIRED_EVIDENCE_SET_EXPANDED',
  evidence_ids: ['e1', 'e2'],
  temporal_context: { event_cutoff: '2026-10-03T00:00:00.000Z' },
  rule_version: 'formation-v1',
  processing_context_id: 'proc-1',
  provenance: { source_lineage_ids: ['lineage-1'] },
  sequence: 1,
  previous_transition_id: null,
};

test('formation transition is deterministic and domain separated', () => {
  const a = createAnalyticalTransition(DOMAINS.FORMATION, base);
  const b = createAnalyticalTransition(DOMAINS.FORMATION, { ...base });
  assert.equal(a.transition_id, b.transition_id);
  assert.equal(a.domain, DOMAINS.FORMATION);
  assert.notEqual(a.transition_id, '');
});

test('hypothesis and validation use distinct transition domains', () => {
  const h = createAnalyticalTransition(DOMAINS.HYPOTHESIS, {
    ...base,
    entity_id: 'hypothesis:h1',
    previous_state: 'PROPOSED',
    next_state: 'SUPPORTED',
    rule_version: 'hypothesis-v1',
  });
  const v = createAnalyticalTransition(DOMAINS.VALIDATION, {
    ...base,
    entity_id: 'validation:v1',
    previous_state: 'PENDING',
    next_state: 'EVALUATING',
    rule_version: 'validation-v1',
  });
  assert.notEqual(h.domain, v.domain);
  assert.notEqual(h.transition_id, v.transition_id);
});

test('illegal state transition fails closed', () => {
  assert.throws(
    () => createAnalyticalTransition(DOMAINS.FORMATION, { ...base, previous_state: 'OBSERVED', next_state: 'VALID' }),
    /ANALYTICAL_TRANSITION_NOT_ALLOWED/
  );
});

test('invalid state and missing provenance fail closed', () => {
  assert.throws(
    () => createAnalyticalTransition(DOMAINS.FORMATION, { ...base, next_state: 'CONFIRMED' }),
    /ANALYTICAL_STATE_INVALID/
  );
  const { provenance, ...missing } = base;
  assert.throws(
    () => createAnalyticalTransition(DOMAINS.FORMATION, missing),
    /PROVENANCE_REQUIRED/
  );
});

test('analytical states are independent from V4 transition states', () => {
  assert.ok(DOMAIN_STATES.FORMATION.includes('VALID'));
  assert.ok(DOMAIN_STATES.VALIDATION.includes('CONFIRMED'));
  assert.notEqual(DOMAINS.FORMATION, 'HAHAWEEK-EVIDENCE-V4-TRANSITION');
});
