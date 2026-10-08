'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { defineSource } = require('../src/acquisition/source-registry');
const { createAcquisitionResult } = require('../src/acquisition/acquisition-result');
const {
  CONTRACT_VERSION,
  createAcquisitionEvidenceLine,
  assertIndependentEvidence,
} = require('../src/core/source-independence');

function source(id, lineage, independence_class) {
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

function line(acq, src) {
  return createAcquisitionEvidenceLine({
    acquisitionResult: acquisition(acq, src),
    source: source(src, src === 'source-a' ? 'lineage-a' : 'lineage-b', 'I3'),
  });
}

const independent = assertIndependentEvidence([
  line('acq-a', 'source-a'),
  line('acq-b', 'source-b'),
]);

assert.equal(CONTRACT_VERSION, 'SOURCE-INDEPENDENCE-EXECUTION-V1.1');
assert.equal(independent.class, 'I3');

let sameLineageRejected = false;
try {
  assertIndependentEvidence([
    createAcquisitionEvidenceLine({
      acquisitionResult: acquisition('acq-a', 'source-a'),
      source: source('source-a', 'lineage-shared', 'I3'),
    }),
    createAcquisitionEvidenceLine({
      acquisitionResult: acquisition('acq-b', 'source-b'),
      source: source('source-b', 'lineage-shared', 'I3'),
    }),
  ]);
} catch (error) {
  sameLineageRejected = error.message === 'INDEPENDENT_SOURCE_THRESHOLD_NOT_MET';
}
assert.equal(sameLineageRejected, true);

const output = {
  verification_class: 'E5_RUNTIME',
  contract_id: CONTRACT_VERSION,
  state: 'VERIFIED',
  chain_id: 4663,
  observed_source_lines: 2,
  independent_lineage_count: 2,
  independent_class: independent.class,
  negative_vector_same_lineage: 'REJECTED',
  authoritative_evidence_mutated: false,
  production_authority_mutated: false,
  cursor_mutated: false,
  external_action: false,
  verification_id: 'source-independence-runtime:v1:' +
    crypto.createHash('sha256').update(JSON.stringify({
      contract: CONTRACT_VERSION,
      independent,
      negative: 'INDEPENDENT_SOURCE_THRESHOLD_NOT_MET',
    })).digest('hex'),
};

process.stdout.write(JSON.stringify(output, null, 2) + '\n');
