'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createHypothesis,
  transitionHypothesis,
  linkValidationToHypothesis,
} = require('../src/core/formation-hypothesis-validation');

function hypothesisInput(overrides = {}) {
  return {
    formation_id: 'formation:v1:test',
    formation_state: 'VALID',
    statement: 'The observed pool bootstrap persists under the defined outcome criterion.',
    evidence_ids: ['e:pool', 'e:liquidity', 'e:swap'],
    temporal_context: { formation_cutoff: '2026-10-03T00:02:00.000Z' },
    processing_context_id: 'proc:1',
    provenance: { source_lineage_ids: ['lineage:1'] },
    ...overrides,
  };
}

test('hypothesis requires a VALID formation and remains DERIVED', () => {
  const hypothesis = createHypothesis(hypothesisInput());
  assert.equal(hypothesis.state, 'PROPOSED');
  assert.equal(hypothesis.authority, 'DERIVED');
  assert.equal(hypothesis.formation_id, 'formation:v1:test');
  assert.ok(hypothesis.hypothesis_id.startsWith('hypothesis:v1:'));
});

test('hypothesis cannot be created from partial or candidate formation', () => {
  assert.throws(
    () => createHypothesis(hypothesisInput({ formation_state: 'CANDIDATE' })),
    /HYPOTHESIS_REQUIRES_VALID_FORMATION/
  );
});

test('hypothesis transition uses the dedicated analytical domain', () => {
  const hypothesis = createHypothesis(hypothesisInput());
  const transition = transitionHypothesis(hypothesis, 'SUPPORTED', {
    reason: 'VALIDATION_PRECONDITION_MET',
    sequence: 1,
  });
  assert.equal(transition.domain, 'HAHAWEEK-EVIDENCE-V4-HYPOTHESIS-TRANSITION');
  assert.equal(transition.previous_state, 'PROPOSED');
  assert.equal(transition.next_state, 'SUPPORTED');
});

test('illegal hypothesis transition fails closed', () => {
  const hypothesis = createHypothesis(hypothesisInput());
  assert.throws(
    () => transitionHypothesis(hypothesis, 'CONFIRMED'),
    /ANALYTICAL_STATE_INVALID/
  );
});

test('validation linkage preserves hypothesis and validation provenance without promotion', () => {
  const hypothesis = createHypothesis(hypothesisInput());
  const link = linkValidationToHypothesis({
    hypothesis,
    validation: {
      validation_id: 'validation:v2:test',
      result: 'INCONCLUSIVE',
      evidence_ids: ['e:outcome'],
    },
  });
  assert.equal(link.relationship, 'HYPOTHESIS_VALIDATION');
  assert.equal(link.hypothesis_id, hypothesis.hypothesis_id);
  assert.equal(link.validation_result, 'INCONCLUSIVE');
  assert.equal(link.authority, 'DERIVED');
});

test('validation result cannot be silently promoted into hypothesis authority', () => {
  const hypothesis = createHypothesis(hypothesisInput());
  assert.throws(
    () => linkValidationToHypothesis({
      hypothesis: { ...hypothesis, authority: 'V4' },
      validation: {
        validation_id: 'validation:v2:test',
        result: 'CONFIRMED',
        evidence_ids: ['e:outcome'],
      },
    }),
    /HYPOTHESIS_AUTHORITY_INVALID/
  );
});
