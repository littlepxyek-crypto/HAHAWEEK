'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createResearchReportIntegration,
} = require('../src/core/research-report-integration');

function reportInput(overrides = {}) {
  return {
    formation: {
      formation_id: 'formation:001',
      formation_rule_version: 'formation-v1',
      evidence_ids: ['evidence:001'],
    },
    outcome: {
      outcome_id: 'outcome:001',
      formation_id: 'formation:001',
      evidence_ids: ['evidence:002'],
    },
    validation: {
      validation_id: 'validation:001',
      formation_id: 'formation:001',
      outcome_id: 'outcome:001',
      result: 'CONFIRMED',
      evidence_ids: ['evidence:003'],
    },
    claims: [
      {
        claim_id: 'claim:001',
        statement: 'A validated formation was documented.',
        evidence_ids: ['evidence:001', 'evidence:003'],
      },
    ],
    ...overrides,
  };
}

test('creates a research report through the integration boundary', () => {
  const result = createResearchReportIntegration(reportInput());
  assert.match(result.report_id, /^report:v1:[a-f0-9]{64}$/);
  assert.equal(result.validation_result, 'CONFIRMED');
});

test('delegated report identity remains deterministic', () => {
  const a = createResearchReportIntegration(reportInput());
  const b = createResearchReportIntegration(reportInput());
  assert.equal(a.report_id, b.report_id);
});

test('integration isolates caller-owned input', () => {
  const input = reportInput();
  const result = createResearchReportIntegration(input);
  input.claims[0].evidence_ids.push('evidence:004');
  input.formation.evidence_ids.push('evidence:005');

  assert.deepEqual(result.claims[0].evidence_ids, ['evidence:001', 'evidence:003']);
  assert.deepEqual(result.evidence_ids, ['evidence:001', 'evidence:003', 'evidence:002']);
});

test('existing formation relationship validation remains authoritative', () => {
  assert.throws(
    () => createResearchReportIntegration(
      reportInput({
        outcome: {
          ...reportInput().outcome,
          formation_id: 'formation:999',
        },
      })
    ),
    /OUTCOME_FORMATION_ID_MISMATCH/
  );
});

test('existing validation result constraints remain authoritative', () => {
  assert.throws(
    () => createResearchReportIntegration(
      reportInput({
        validation: {
          ...reportInput().validation,
          result: 'UNKNOWN',
        },
      })
    ),
    /INVALID_VALIDATION_RESULT/
  );
});
