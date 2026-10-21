'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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

test('hypothesis identity is deterministic for identical semantic inputs', () => {
  const first = createHypothesis(hypothesisInput());
  const replay = createHypothesis(hypothesisInput());
  assert.equal(replay.hypothesis_id, first.hypothesis_id);
});

test('hypothesis identity changes when statement, formation, or rule version changes', () => {
  const baseline = createHypothesis(hypothesisInput());
  const changedStatement = createHypothesis(hypothesisInput({
    statement: 'A different observed-liquidity hypothesis statement.',
  }));
  const changedFormation = createHypothesis(hypothesisInput({
    formation_id: 'formation:v1:other',
  }));
  const changedRuleVersion = createHypothesis(hypothesisInput({
    rule_version: 'hypothesis-v2',
  }));

  assert.notEqual(changedStatement.hypothesis_id, baseline.hypothesis_id);
  assert.notEqual(changedFormation.hypothesis_id, baseline.hypothesis_id);
  assert.notEqual(changedRuleVersion.hypothesis_id, baseline.hypothesis_id);
});

test('runtime replay uses the canonical liquidity-survival hypothesis statement', () => {
  const runtimeSource = fs.readFileSync(
    path.join(__dirname, '../scripts/hfi-mvp-runtime-verify.js'),
    'utf8'
  );

  assert.match(
    runtimeSource,
    /replayHypothesis=createHypothesis\(\{formation_id:replay\.formation_id,formation_state:replay\.state,statement:LIQUIDITY_SURVIVAL_HYPOTHESIS_STATEMENT,/
  );
  assert.doesNotMatch(
    runtimeSource,
    /statement:'Observed active liquidity survives the configured seven-day validation window\.'/
  );
});
