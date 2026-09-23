'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createXContentProjection } = require('../src/core/x-content-projection');
const { validateXContentPublicationReadiness } = require('../src/core/x-content-validation-readiness');
const { createXPublicationEnvelope } = require('../src/core/x-publication-envelope');
const { createPublicationDeliveryAdapterResult } = require('../src/core/publication-delivery-adapter');

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

function envelope() {
  const research_report = report();
  const projection = createXContentProjection(research_report);
  const readiness = validateXContentPublicationReadiness({ projection, research_report });
  return createXPublicationEnvelope({ research_report, projection, readiness });
}

test('creates deterministic delivery adapter result', () => {
  const first = createPublicationDeliveryAdapterResult({ envelope: envelope() });
  const second = createPublicationDeliveryAdapterResult({ envelope: envelope() });
  assert.deepEqual(first, second);
  assert.match(first.result_id, /^publication-delivery-adapter-result-v1:/);
  assert.equal(first.disposition, 'NOT_ATTEMPTED');
});

test('preserves envelope traceability', () => {
  const value = envelope();
  const result = createPublicationDeliveryAdapterResult({ envelope: value });
  assert.equal(result.envelope_id, value.envelope_id);
  assert.equal(result.readiness_id, value.readiness_id);
  assert.equal(result.report_id, value.report_id);
  assert.deepEqual(result.content_item_ids, value.content_items.map((item) => item.content_item_id));
});

test('preserves all validation states', () => {
  for (const validationResult of ['CONFIRMED', 'REJECTED', 'INCONCLUSIVE']) {
    const research_report = report();
    research_report.validation.result = validationResult;
    const projection = createXContentProjection(research_report);
    const readiness = validateXContentPublicationReadiness({ projection, research_report });
    const value = createXPublicationEnvelope({ research_report, projection, readiness });
    assert.equal(createPublicationDeliveryAdapterResult({ envelope: value }).validation_result, validationResult);
  }
});

test('rejects tampered envelope identity', () => {
  const value = envelope();
  value.envelope_id = 'x-publication-envelope-v1:tampered';
  assert.throws(() => createPublicationDeliveryAdapterResult({ envelope: value }), /ENVELOPE_ID_MISMATCH/);
});

test('rejects invalid envelope version', () => {
  const value = envelope();
  value.envelope_version = 'wrong-version';
  assert.throws(() => createPublicationDeliveryAdapterResult({ envelope: value }), /ENVELOPE_VERSION_INVALID/);
});

test('does not mutate caller-owned input', () => {
  const value = envelope();
  const before = structuredClone(value);
  createPublicationDeliveryAdapterResult({ envelope: value });
  assert.deepEqual(value, before);
});

test('contains no external delivery controls or credentials', () => {
  const result = createPublicationDeliveryAdapterResult({ envelope: envelope() });
  for (const field of ['publish', 'schedule', 'retry', 'sign', 'credentials', 'transport', 'request']) assert.equal(Object.hasOwn(result, field), false);
});
