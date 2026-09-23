'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createXContentProjection } = require('../src/core/x-content-projection');

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

test('creates deterministic X content projection', () => {
  const input = report();
  const first = createXContentProjection(input);
  const second = createXContentProjection(input);
  assert.deepEqual(first, second);
  assert.equal(first.content_items.length, 2);
  assert.equal(first.validation_result, 'CONFIRMED');
});

test('preserves claim to evidence traceability', () => {
  const projection = createXContentProjection(report());
  assert.equal(projection.content_items[0].claim_id, 'claim:1');
  assert.deepEqual(projection.content_items[0].evidence_ids, ['evidence:formation', 'evidence:validation']);
});

test('does not mutate caller-owned input', () => {
  const input = report();
  const before = structuredClone(input);
  createXContentProjection(input);
  assert.deepEqual(input, before);
});

test('preserves validation state without reinterpretation', () => {
  for (const result of ['CONFIRMED', 'REJECTED', 'INCONCLUSIVE']) {
    const input = report();
    input.validation.result = result;
    assert.equal(createXContentProjection(input).validation_result, result);
  }
});

test('delegates malformed report rejection to research report authority', () => {
  const input = report();
  input.claims = [];
  assert.throws(() => createXContentProjection(input), /CLAIMS_REQUIRED/);
});
