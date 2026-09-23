'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createValidatedRadarRecordIntegration,
} = require('../src/core/validated-radar-record-integration');

function summary(overrides = {}) {
  return {
    summary_id: 'summary:v1:001',
    intelligence_id: 'intelligence:v1:001',
    formation_id: 'formation:pool-bootstrap:001',
    outcome_id: 'outcome:v1:001',
    validation_id: 'validation:v1:001',
    validation_result: 'CONFIRMED',
    evidence_ids: ['evidence:001', 'evidence:002'],
    ...overrides,
  };
}

test('creates a validated radar record through the integration boundary', () => {
  const result = createValidatedRadarRecordIntegration({ summary: summary() });
  assert.equal(result.radar_type, 'EARLY_FORMATION');
  assert.equal(result.state, 'VERIFIED');
  assert.equal(result.validation_result, 'CONFIRMED');
});

test('delegated radar identity remains deterministic', () => {
  const a = createValidatedRadarRecordIntegration({ summary: summary() });
  const b = createValidatedRadarRecordIntegration({ summary: summary() });
  assert.equal(a.radar_id, b.radar_id);
});

test('integration isolates caller-owned input', () => {
  const input = { summary: summary() };
  const result = createValidatedRadarRecordIntegration(input);
  input.summary.evidence_ids.push('evidence:003');
  input.summary.validation_result = 'REJECTED';
  assert.deepEqual(result.evidence_ids, ['evidence:001', 'evidence:002']);
  assert.equal(result.validation_result, 'CONFIRMED');
});

test('integration preserves frozen CONFIRMED-only eligibility', () => {
  assert.throws(
    () => createValidatedRadarRecordIntegration({
      summary: summary({ validation_result: 'INCONCLUSIVE' }),
    }),
    /RADAR_REQUIRES_CONFIRMED_VALIDATION/
  );
});

test('integration preserves duplicate evidence rejection', () => {
  assert.throws(
    () => createValidatedRadarRecordIntegration({
      summary: summary({ evidence_ids: ['evidence:001', 'evidence:001'] }),
    }),
    /EVIDENCE_IDS_DUPLICATE/
  );
});
