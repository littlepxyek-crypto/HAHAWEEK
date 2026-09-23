'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createXContentProjection } = require('../src/core/x-content-projection');
const { validateXContentPublicationReadiness } = require('../src/core/x-content-validation-readiness');
const { createXPublicationEnvelope } = require('../src/core/x-publication-envelope');

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
  const projection = createXContentProjection(research_report);
  const readiness = validateXContentPublicationReadiness({ projection, research_report });
  return { research_report, projection, readiness };
}

test('creates deterministic publication envelope', () => {
  const first = createXPublicationEnvelope(input());
  const second = createXPublicationEnvelope(input());
  assert.deepEqual(first, second);
  assert.match(first.envelope_id, /^x-publication-envelope-v1:/);
});

test('preserves readiness and evidence traceability', () => {
  const value = input();
  const envelope = createXPublicationEnvelope(value);
  assert.equal(envelope.readiness_id, value.readiness.readiness_id);
  assert.equal(envelope.report_id, value.projection.report_id);
  assert.deepEqual(envelope.content_items[0].evidence_ids, value.projection.content_items[0].evidence_ids);
});

test('preserves validation state exactly', () => {
  for (const result of ['CONFIRMED', 'REJECTED', 'INCONCLUSIVE']) {
    const value = input();
    value.research_report.validation.result = result;
    value.projection = createXContentProjection(value.research_report);
    value.readiness = validateXContentPublicationReadiness({ projection: value.projection, research_report: value.research_report });
    assert.equal(createXPublicationEnvelope(value).validation_result, result);
  }
});

test('rejects readiness identity mismatch', () => {
  const value = input();
  value.readiness.readiness_id = 'x-publication-readiness-v1:wrong';
  assert.throws(() => createXPublicationEnvelope(value), /READINESS_ID_MISMATCH/);
});

test('rejects content item mismatch', () => {
  const value = input();
  value.readiness.content_item_ids = ['x-content:v1:wrong'];
  assert.throws(() => createXPublicationEnvelope(value), /READINESS_CONTENT_ITEMS_MISMATCH/);
});

test('does not mutate caller-owned input', () => {
  const value = input();
  const before = structuredClone(value);
  createXPublicationEnvelope(value);
  assert.deepEqual(value, before);
});

test('contains no external publication controls', () => {
  const envelope = createXPublicationEnvelope(input());
  assert.equal(Object.hasOwn(envelope, 'publish'), false);
  assert.equal(Object.hasOwn(envelope, 'schedule'), false);
  assert.equal(Object.hasOwn(envelope, 'sign'), false);
});
