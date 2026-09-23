'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createRadarDocumentationProjectionIntegration,
} = require('../src/core/radar-documentation-projection-integration');

function radar(overrides = {}) {
  return {
    radar_id: 'radar:v1:001',
    radar_type: 'EARLY_FORMATION',
    state: 'VERIFIED',
    summary_id: 'summary:v1:001',
    intelligence_id: 'intelligence:v1:001',
    formation_id: 'formation:001',
    outcome_id: 'outcome:001',
    validation_id: 'validation:001',
    validation_result: 'CONFIRMED',
    evidence_ids: ['evidence:001', 'evidence:002'],
    ...overrides,
  };
}

test('creates documentation through the integration boundary', () => {
  const result = createRadarDocumentationProjectionIntegration({ radar: radar() });
  assert.match(result.document_id, /^radar-document:v1:[a-f0-9]{64}$/);
  assert.equal(result.state, 'VERIFIED');
});

test('delegated document identity remains deterministic', () => {
  const a = createRadarDocumentationProjectionIntegration({ radar: radar() });
  const b = createRadarDocumentationProjectionIntegration({ radar: radar() });
  assert.equal(a.document_id, b.document_id);
});

test('integration isolates caller-owned radar input', () => {
  const input = { radar: radar() };
  const result = createRadarDocumentationProjectionIntegration(input);
  input.radar.evidence_ids.push('evidence:003');
  assert.deepEqual(result.evidence_ids, ['evidence:001', 'evidence:002']);
});

test('non-verified radar remains rejected by frozen projection semantics', () => {
  assert.throws(
    () => createRadarDocumentationProjectionIntegration({
      radar: radar({ state: 'HISTORICAL' }),
    }),
    /DOCUMENT_REQUIRES_VERIFIED_RADAR/
  );
});
