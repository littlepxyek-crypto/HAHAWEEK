'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createRadarDocumentationProjection } =
  require('../src/core/radar-documentation-projection');

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

test('projects a verified radar record into documentation', () => {
  const result = createRadarDocumentationProjection({ radar: radar() });
  assert.match(result.document_id, /^radar-document:v1:[a-f0-9]{64}$/);
  assert.equal(result.document_type, 'VERIFIED_RADAR_RECORD');
  assert.equal(result.state, 'VERIFIED');
});

test('documentation identity is deterministic', () => {
  const a = createRadarDocumentationProjection({ radar: radar() });
  const b = createRadarDocumentationProjection({ radar: radar() });
  assert.equal(a.document_id, b.document_id);
});

test('documentation projection isolates caller-owned input', () => {
  const input = { radar: radar() };
  const result = createRadarDocumentationProjection(input);
  input.radar.evidence_ids.push('evidence:003');
  assert.deepEqual(result.evidence_ids, ['evidence:001', 'evidence:002']);
  result.evidence_ids.push('evidence:004');
  assert.deepEqual(input.radar.evidence_ids, [
    'evidence:001',
    'evidence:002',
    'evidence:003',
  ]);
});

test('non-verified radar cannot be documented as verified radar', () => {
  assert.throws(
    () => createRadarDocumentationProjection({ radar: radar({ state: 'HISTORICAL' }) }),
    /DOCUMENT_REQUIRES_VERIFIED_RADAR/
  );
});

test('duplicate evidence remains rejected', () => {
  assert.throws(
    () => createRadarDocumentationProjection({
      radar: radar({ evidence_ids: ['evidence:001', 'evidence:001'] }),
    }),
    /EVIDENCE_IDS_DUPLICATE/
  );
});
