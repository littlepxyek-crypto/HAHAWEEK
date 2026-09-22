'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createResearchReport } = require('../src/core/research-report');

function input(overrides = {}) {
  const formation = {
    formation_id: 'formation:v1:test',
    formation_rule_version: 'pool-bootstrap-v1',
    evidence_ids: ['ei:formation'],
  };
  const outcome = {
    outcome_id: 'outcome:v1:test',
    formation_id: formation.formation_id,
    evidence_ids: ['ei:outcome'],
  };
  const validation = {
    validation_id: 'validation:v1:test',
    formation_id: formation.formation_id,
    outcome_id: outcome.outcome_id,
    result: 'CONFIRMED',
    evidence_ids: ['ei:validation'],
  };
  return {
    formation,
    outcome,
    validation,
    claims: [{
      claim_id: 'formation-observed',
      statement: 'A Pool Bootstrap formation was observed.',
      evidence_ids: ['ei:formation'],
    }],
    ...overrides,
  };
}

test('creates a deterministic provenance-complete research report', () => {
  const a = createResearchReport(input());
  const b = createResearchReport(input());
  assert.equal(a.report_id, b.report_id);
  assert.equal(a.validation_result, 'CONFIRMED');
  assert.deepEqual(a.evidence_ids, ['ei:formation', 'ei:outcome', 'ei:validation']);
});

test('rejects outcome linked to a different formation', () => {
  assert.throws(
    () => createResearchReport(input({
      outcome: {
        ...input().outcome,
        formation_id: 'formation:v1:other',
      },
    })),
    /OUTCOME_FORMATION_ID_MISMATCH/
  );
});

test('rejects validation linked to a different formation', () => {
  assert.throws(
    () => createResearchReport(input({
      validation: {
        ...input().validation,
        formation_id: 'formation:v1:other',
      },
    })),
    /VALIDATION_FORMATION_ID_MISMATCH/
  );
});

test('rejects validation linked to a different outcome', () => {
  assert.throws(
    () => createResearchReport(input({
      validation: {
        ...input().validation,
        outcome_id: 'outcome:v1:other',
      },
    })),
    /VALIDATION_OUTCOME_ID_MISMATCH/
  );
});

test('preserves INCONCLUSIVE validation as report state', () => {
  const report = createResearchReport(input({
    validation: {
      ...input().validation,
      result: 'INCONCLUSIVE',
    },
  }));
  assert.equal(report.validation_result, 'INCONCLUSIVE');
});
