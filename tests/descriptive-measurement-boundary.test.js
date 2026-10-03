'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDescriptiveMeasurement,
  DESCRIPTIVE_MEASUREMENT_RULE_VERSION,
} = require('../src/core/descriptive-measurement-boundary');

function input(overrides = {}) {
  return {
    measurement_id: 'measurement:v1:test',
    measurement_rule_version: DESCRIPTIVE_MEASUREMENT_RULE_VERSION,
    metric_name: 'liquidity_added_native',
    value: 12.5,
    unit: 'native_asset',
    evidence_ids: ['evidence:001', 'evidence:001'],
    measurement_time: '2026-10-03T08:00:00.000Z',
    ...overrides,
  };
}

test('creates deterministic descriptive measurement with provenance', () => {
  const a = createDescriptiveMeasurement(input());
  const b = createDescriptiveMeasurement(input());

  assert.equal(a.measurement_rule_version, DESCRIPTIVE_MEASUREMENT_RULE_VERSION);
  assert.equal(a.measurement_identity, b.measurement_identity);
  assert.deepEqual(a.evidence_ids, ['evidence:001']);
});

test('rejects non-finite measurement values', () => {
  assert.throws(
    () => createDescriptiveMeasurement(input({ value: Infinity })),
    /MEASUREMENT_VALUE_MUST_BE_FINITE/
  );
});

test('rejects invalid measurement timestamps', () => {
  assert.throws(
    () => createDescriptiveMeasurement(input({ measurement_time: 'not-a-time' })),
    /INVALID_MEASUREMENT_TIME/
  );
});

test('rejects missing measurement rule version', () => {
  assert.throws(
    () => createDescriptiveMeasurement(input({ measurement_rule_version: undefined })),
    /MEASUREMENT_RULE_VERSION_REQUIRED/
  );
});

test('rejects missing evidence', () => {
  assert.throws(
    () => createDescriptiveMeasurement(input({ evidence_ids: [] })),
    /MEASUREMENT_EVIDENCE_IDS_REQUIRED/
  );
});

test('rejects predictive/ranking decision fields', () => {
  for (const field of ['score', 'rank', 'ranking', 'prediction', 'signal', 'recommendation', 'action', 'buy_sell', 'trading_decision']) {
    assert.throws(
      () => createDescriptiveMeasurement(input({ [field]: 1 })),
      new RegExp('DESCRIPTIVE_DECISION_FIELD_FORBIDDEN:' + field)
    );
  }
});

test('caller mutation does not change canonical result', () => {
  const source = input();
  const result = createDescriptiveMeasurement(source);
  source.evidence_ids.push('evidence:002');
  assert.deepEqual(result.evidence_ids, ['evidence:001']);
});
