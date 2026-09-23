'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createRadarDocumentationRecordIntegration,
} = require('../src/core/radar-documentation-record-integration');

function document(overrides = {}) {
  return {
    document_id: 'radar-document:v1:001',
    document_type: 'VERIFIED_RADAR_RECORD',
    radar_id: 'radar:v1:001',
    radar_type: 'EARLY_FORMATION',
    state: 'VERIFIED',
    validation_result: 'CONFIRMED',
    lineage: {
      summary_id: 'summary:v1:001',
      intelligence_id: 'intelligence:v1:001',
      formation_id: 'formation:001',
      outcome_id: 'outcome:001',
      validation_id: 'validation:001',
    },
    evidence_ids: ['evidence:001', 'evidence:002'],
    ...overrides,
  };
}

test('creates a documentation record through the integration boundary', () => {
  const result = createRadarDocumentationRecordIntegration({ document: document() });
  assert.match(result.record_id, /^radar-document-record:v1:[a-f0-9]{64}$/);
  assert.equal(result.state, 'VERIFIED');
});

test('delegated record identity remains deterministic', () => {
  const a = createRadarDocumentationRecordIntegration({ document: document() });
  const b = createRadarDocumentationRecordIntegration({ document: document() });
  assert.equal(a.record_id, b.record_id);
});

test('integration isolates caller-owned document input', () => {
  const input = { document: document() };
  const result = createRadarDocumentationRecordIntegration(input);
  input.document.evidence_ids.push('evidence:003');
  assert.deepEqual(result.evidence_ids, ['evidence:001', 'evidence:002']);
});

test('STEP 474 semantics remain authoritative', () => {
  assert.throws(
    () => createRadarDocumentationRecordIntegration({
      document: document({ document_type: 'OTHER' }),
    }),
    /DOCUMENT_TYPE_INVALID/
  );
});

test('duplicate evidence rejection remains delegated', () => {
  assert.throws(
    () => createRadarDocumentationRecordIntegration({
      document: document({ evidence_ids: ['evidence:001', 'evidence:001'] }),
    }),
    /EVIDENCE_IDS_DUPLICATE/
  );
});
