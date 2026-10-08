'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { defineSource } = require('../src/acquisition/source-registry');
const { createAcquisitionResult } = require('../src/acquisition/acquisition-result');
const {
  createAcquisitionEvidenceLine,
  assertIndependentEvidence,
} = require('../src/core/source-independence');

function source(id, lineage, independence_class = 'I3') {
  return defineSource({
    source_id: id,
    source_type: 'WEB',
    backend: 'HTTP',
    enabled: true,
    provenance: { source_lineage_id: lineage, independence_class, independence_assessed: independence_class === 'I3', independence_basis: independence_class === 'I3' ? 'test-lineage-review' : undefined, independence_rule_version: independence_class === 'I3' ? 'SOURCE-INDEPENDENCE-EXECUTION-V1.1' : undefined },
  });
}

function acquisition(id, source_id) {
  return createAcquisitionResult({
    acquisition_id: id,
    source_id,
    source_type: 'WEB',
    backend: 'HTTP',
    target: 'https://example.test/' + id,
    started_at: '2026-10-04T00:00:00.000Z',
    completed_at: '2026-10-04T00:00:01.000Z',
    status: 'OBSERVED',
    content_type: 'text/plain',
    content: 'evidence:' + id,
  });
}

test('acquisition evidence line binds source lineage and acquisition identity', () => {
  const line = createAcquisitionEvidenceLine({
    acquisitionResult: acquisition('acq-a', 'source-a'),
    source: source('source-a', 'lineage-a'),
  });
  assert.equal(line.source_lineage_id, 'lineage-a');
  assert.equal(line.acquisition_id, 'acq-a');
  assert.equal(line.independence_class, 'I3');
  assert.match(line.content_hash, /^[0-9a-f]{64}$/);
});

test('two observed acquisitions from independent lineages qualify as I3', () => {
  const lines = [
    createAcquisitionEvidenceLine({ acquisitionResult: acquisition('acq-a', 'source-a'), source: source('source-a', 'lineage-a') }),
    createAcquisitionEvidenceLine({ acquisitionResult: acquisition('acq-b', 'source-b'), source: source('source-b', 'lineage-b') }),
  ];
  assert.equal(assertIndependentEvidence(lines).class, 'I3');
});

test('same acquisition lineage does not qualify as independent even with multiple acquisitions', () => {
  const lines = [
    createAcquisitionEvidenceLine({ acquisitionResult: acquisition('acq-a', 'source-a'), source: source('source-a', 'lineage-a') }),
    createAcquisitionEvidenceLine({ acquisitionResult: acquisition('acq-b', 'source-b'), source: source('source-b', 'lineage-a') }),
  ];
  assert.throws(() => assertIndependentEvidence(lines), /INDEPENDENT_SOURCE_THRESHOLD_NOT_MET/);
});

test('non-observed acquisition cannot become source evidence', () => {
  const result = {
    ...acquisition('acq-a', 'source-a'),
    status: 'UNAVAILABLE',
  };
  assert.throws(
    () => createAcquisitionEvidenceLine({ acquisitionResult: result, source: source('source-a', 'lineage-a') }),
    /SOURCE_INDEPENDENCE_ACQUISITION_NOT_OBSERVED/
  );
});

test('source identity mismatch fails closed', () => {
  assert.throws(
    () => createAcquisitionEvidenceLine({
      acquisitionResult: acquisition('acq-a', 'source-a'),
      source: source('source-b', 'lineage-b'),
    }),
    /SOURCE_INDEPENDENCE_SOURCE_ID_MISMATCH/
  );
});
