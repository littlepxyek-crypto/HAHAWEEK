'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createXContentProjection } = require('../src/core/x-content-projection');
const { validateXContentPublicationReadiness } = require('../src/core/x-content-validation-readiness');

function report() {
  return {
    formation: { formation_id: 'formation:1', formation_rule_version: 'formation-v1', evidence_ids: ['evidence:formation'] },
    outcome: { outcome_id: 'outcome:1', formation_id: 'formation:1', evidence_ids: ['evidence:outcome'] },
    validation: { validation_id: 'validation:1', formation_id: 'formation:1', outcome_id: 'outcome:1', result: 'CONFIRMED', evidence_ids: ['evidence:validation'] },
    claims: [
      { claim_id: 'claim:1', statement: 'Formation has corroborating evidence.', evidence_ids: ['evidence:formation', 'evidence:validation'] },
      { claim_id: 'claim:2', statement: 'Historical outcome is preserved.', evidence_ids: ['evidence:outcome'] },
    ],
  };
}

function input() {
  const research_report = report();
  return { research_report, projection: createXContentProjection(research_report) };
}

test('valid projection is publication-ready structurally and deterministically', () => {
  const first = validateXContentPublicationReadiness(input());
  const second = validateXContentPublicationReadiness(input());
  assert.equal(first.publication_ready, true);
  assert.deepEqual(first, second);
  assert.match(first.readiness_id, /^x-publication-readiness-v1:/);
});

test('preserves validation state exactly', () => {
  for (const result of ['CONFIRMED', 'REJECTED', 'INCONCLUSIVE']) {
    const research_report = report();
    research_report.validation.result = result;
    const projection = createXContentProjection(research_report);
    const resultArtifact = validateXContentPublicationReadiness({ projection, research_report });
    assert.equal(resultArtifact.validation_result, result);
  }
});

test('rejects report mismatch', () => {
  const value = input();
  value.projection.report_id = 'report:wrong';
  assert.throws(() => validateXContentPublicationReadiness(value), /REPORT_ID_MISMATCH/);
});

test('rejects claim statement mismatch', () => {
  const value = input();
  value.projection.content_items[0].statement = 'Changed statement.';
  assert.throws(() => validateXContentPublicationReadiness(value), /CLAIM_STATEMENT_MISMATCH/);
});

test('rejects evidence mismatch', () => {
  const value = input();
  value.projection.content_items[0].evidence_ids = ['evidence:other'];
  assert.throws(() => validateXContentPublicationReadiness(value), /CLAIM_EVIDENCE_IDS_MISMATCH/);
});

test('rejects content item identity mismatch', () => {
  const value = input();
  value.projection.content_items[0].content_item_id = 'x-content:v1:wrong';
  assert.throws(() => validateXContentPublicationReadiness(value), /CONTENT_ITEM_ID_MISMATCH/);
});

test('rejects incomplete claim coverage', () => {
  const value = input();
  value.projection.content_items.pop();
  assert.throws(() => validateXContentPublicationReadiness(value), /CLAIM_COVERAGE_MISMATCH/);
});

test('does not mutate caller-owned input', () => {
  const value = input();
  const before = structuredClone(value);
  validateXContentPublicationReadiness(value);
  assert.deepEqual(value, before);
});

test('has no publication side effect', () => {
  const value = input();
  const resultArtifact = validateXContentPublicationReadiness(value);
  assert.equal(Object.hasOwn(resultArtifact, 'publish'), false);
  assert.equal(Object.hasOwn(resultArtifact, 'schedule'), false);
});
