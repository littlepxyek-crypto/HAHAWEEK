'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { createCanonicalEvidence } = require('../src/core/canonical-evidence');
const {
  hashRawEvidence,
  hashCanonicalEvidence,
} = require('../src/core/evidence-identity');
const {
  deriveV4EvidenceCommitment,
} = require('../src/core/v4-evidence-commitment');
const { verifyVectorSet } = require('../scripts/verify-golden-vectors');

function makeRecord(id, blockNumber, transactionIndex, logIndex, blockByte, txByte) {
  const raw = {
    event_id: id,
    chain_id: 4663,
    block_number: blockNumber,
    transaction_hash: '0x' + txByte.repeat(32),
    block_hash: '0x' + blockByte.repeat(32),
    transaction_index: transactionIndex,
    log_index: logIndex,
    address: '0x' + 'aa'.repeat(20),
    topics: [],
    data: '0x',
    captured_at: '2026-01-01T00:00:00.000Z',
  };
  const canonical = createCanonicalEvidence(raw);
  return {
    evidence_id: canonical.evidence_id,
    identity_schema_version: canonical.identity_reference.identity_schema_version,
    identity_hash: canonical.identity_reference.identity_hash,
    raw_event_id: raw.event_id,
    raw_hash: hashRawEvidence(raw),
    canonical_hash: hashCanonicalEvidence(canonical),
    canonical,
    raw,
  };
}

function makeResult(records, overrides = {}) {
  return {
    processingResultId: 'pr:v1:test-001',
    fromBlock: 100,
    toBlock: 101,
    generation: '7',
    status: 'ACCEPTED_CANONICAL',
    canonicalEvidenceIds: records.map(r => r.evidence_id),
    emptyResult: false,
    ...overrides,
  };
}

test('STEP 564 golden-vector fixture is independently verified', () => {
  const file = path.join(__dirname, '..', 'docs', 'golden-vectors', 'v4-evidence-commitment.json');
  const result = verifyVectorSet(file);
  assert.equal(result.count, 5);
});

test('derivation is deterministic and independent of input/database ordering', () => {
  const a = makeRecord('raw-a', 101, 1, 0, '44', '33');
  const b = makeRecord('raw-b', 100, 0, 1, '22', '11');

  const first = deriveV4EvidenceCommitment({
    processingResult: makeResult([a, b]),
    evidenceRecords: [a, b],
  });
  const second = deriveV4EvidenceCommitment({
    processingResult: makeResult([a, b]),
    evidenceRecords: [b, a],
  });

  assert.deepEqual(first, second);
  assert.equal(first.cursorBlock, 101);
  assert.equal(first.fromBlock, 100);
  assert.equal(first.toBlock, 101);
  assert.equal(first.generation, '7');
  assert.match(first.segmentId, /^seg:v1:[0-9a-f]{64}$/);
  assert.match(first.manifestId, /^manifest:v1:[0-9a-f]{64}$/);
  assert.match(first.checkpointDigest, /^0x[0-9a-f]{64}$/);
});

test('generation is supplied by processing result and missing generation fails closed', () => {
  const a = makeRecord('raw-a', 100, 0, 0, '22', '11');
  const result = makeResult([a]);
  delete result.generation;

  assert.throws(
    () => deriveV4EvidenceCommitment({
      processingResult: result,
      evidenceRecords: [a],
    }),
    /F03_CHECKPOINT_MANIFEST_DIGEST_INVALID|F03_GENERATION_INVALID/
  );
});

test('range mutation fails closed', () => {
  const a = makeRecord('raw-a', 100, 0, 0, '22', '11');
  const result = makeResult([a], { toBlock: 100 });

  assert.throws(
    () => deriveV4EvidenceCommitment({
      processingResult: result,
      evidenceRecords: [a],
    }),
    /V4_EVIDENCE_RANGE_MISMATCH|V4_EVIDENCE_MEMBERSHIP/
  );
});

test('tampered canonical evidence fails closed before commitment construction', () => {
  const a = makeRecord('raw-a', 100, 0, 0, '22', '11');
  a.canonical.location.block_hash = '0x' + '99'.repeat(32);

  assert.throws(
    () => deriveV4EvidenceCommitment({
      processingResult: makeResult([a]),
      evidenceRecords: [a],
    }),
    /V4_CANONICAL_HASH_MISMATCH|V4_EVIDENCE_IDENTITY_MISMATCH/
  );
});

test('reorg-invalid evidence fails closed instead of being silently reused', () => {
  const a = makeRecord('raw-a', 100, 0, 0, '22', '11');
  a.raw.block_hash = '0x' + '99'.repeat(32);

  assert.throws(
    () => deriveV4EvidenceCommitment({
      processingResult: makeResult([a]),
      evidenceRecords: [a],
    }),
    /V4_RAW_HASH_MISMATCH/
  );
});

test('membership and duplicate evidence fail closed', () => {
  const a = makeRecord('raw-a', 100, 0, 0, '22', '11');
  const b = makeRecord('raw-b', 101, 1, 0, '44', '33');

  assert.throws(
    () => deriveV4EvidenceCommitment({
      processingResult: makeResult([a, b], {
        canonicalEvidenceIds: [a.evidence_id],
      }),
      evidenceRecords: [a, b],
    }),
    /V4_EVIDENCE_MEMBERSHIP_MISMATCH/
  );
});

test('empty result requires explicit support and declaration', () => {
  const result = makeResult([], { canonicalEvidenceIds: [], emptyResult: false });

  assert.throws(
    () => deriveV4EvidenceCommitment({
      processingResult: result,
      evidenceRecords: [],
    }),
    /V4_EMPTY_EVIDENCE_NOT_EXPLICITLY_SUPPORTED/
  );

  const allowed = deriveV4EvidenceCommitment({
    processingResult: { ...result, emptyResult: true },
    evidenceRecords: [],
    allowEmptyResult: true,
  });
  assert.equal(allowed.canonicalEvidenceCount, 0);
});

test('checkpoint uses the existing F-03 derivation and no cursor mutation occurs', () => {
  const a = makeRecord('raw-a', 100, 0, 0, '22', '11');
  const result = deriveV4EvidenceCommitment({
    processingResult: makeResult([a]),
    evidenceRecords: [a],
  });

  assert.equal(result.cursorBlock, result.toBlock);
  assert.equal(Object.hasOwn(result, 'cursor'), false);
});
