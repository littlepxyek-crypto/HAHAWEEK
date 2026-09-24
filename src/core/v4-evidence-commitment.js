'use strict';

const crypto = require('node:crypto');
const { canonicalUtf8 } = require('../reference/v4/jcs');
const {
  createEvidenceIdentity,
  hashRawEvidence,
  hashCanonicalEvidence,
} = require('./evidence-identity');
const {
  checkpointDigestFor,
  assertGeneration,
} = (() => {
  const persistence = require('./f03-authoritative-chain-persistence');
  return {
    checkpointDigestFor: persistence.checkpointDigestFor,
    assertGeneration: (value) => {
      // Reuse the frozen F-03 generation validator without duplicating its rules.
      persistence.checkpointDigestFor(value, '0'.repeat(64));
      return value;
    },
  };
})();

const LEAF_DOMAIN = 'HAHAWEEK-EVIDENCE-V4-SEGMENT-LEAF';
const SEGMENT_DOMAIN = 'HAHAWEEK-EVIDENCE-V4-SEGMENT-V0.1';
const MANIFEST_DOMAIN = 'HAHAWEEK-EVIDENCE-V4-MANIFEST-V0.1';
const HASH64 = /^[0-9a-f]{64}$/;
const BLOCK_HASH = /^0x[0-9a-f]{64}$/;
const TX_HASH = /^0x[0-9a-f]{64}$/;

function fail(code) {
  throw new Error(code);
}

function hashDomain(domain, value) {
  return crypto.createHash('sha256')
    .update(Buffer.from(domain + '\0', 'utf8'))
    .update(canonicalUtf8(value))
    .digest('hex');
}

function assertBlock(value, code) {
  if (!Number.isSafeInteger(value) || value < 0) fail(code);
  return value;
}

function assertNonEmptyString(value, code) {
  if (typeof value !== 'string' || value.length === 0) fail(code);
  return value;
}

function assertHash64(value, code) {
  if (typeof value !== 'string' || !HASH64.test(value)) fail(code);
  return value;
}

function assertAcceptedProcessingResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    fail('V4_PROCESSING_RESULT_REQUIRED');
  }

  assertNonEmptyString(result.processingResultId, 'V4_PROCESSING_RESULT_ID_INVALID');
  assertBlock(result.fromBlock, 'V4_FROM_BLOCK_INVALID');
  assertBlock(result.toBlock, 'V4_TO_BLOCK_INVALID');
  if (result.fromBlock > result.toBlock) fail('V4_RANGE_INVALID');
  assertGeneration(result.generation);
  if (result.status !== 'ACCEPTED_CANONICAL') fail('V4_CANONICAL_RESULT_NOT_ACCEPTED');
  if (!Array.isArray(result.canonicalEvidenceIds)) {
    fail('V4_CANONICAL_EVIDENCE_IDS_INVALID');
  }
  if (typeof result.emptyResult !== 'boolean') {
    fail('V4_EMPTY_RESULT_DECLARATION_REQUIRED');
  }

  const ids = new Set();
  for (const id of result.canonicalEvidenceIds) {
    assertNonEmptyString(id, 'V4_CANONICAL_EVIDENCE_ID_INVALID');
    if (ids.has(id)) fail('V4_CANONICAL_EVIDENCE_ID_DUPLICATE');
    ids.add(id);
  }
  return result;
}

function authorityKey(record) {
  const canonical = record.canonical;
  const location = canonical.location;
  return [
    location.block_number,
    location.transaction_index,
    location.log_index,
    record.raw_event_id,
  ].join('|');
}

function validateEvidenceRecord(record, fromBlock, toBlock) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    fail('V4_EVIDENCE_RECORD_INVALID');
  }
  assertNonEmptyString(record.evidence_id, 'V4_EVIDENCE_ID_INVALID');
  assertNonEmptyString(record.identity_schema_version, 'V4_IDENTITY_SCHEMA_VERSION_INVALID');
  assertHash64(record.identity_hash, 'V4_IDENTITY_HASH_INVALID');
  assertNonEmptyString(record.raw_event_id, 'V4_RAW_EVENT_ID_INVALID');
  assertHash64(record.raw_hash, 'V4_RAW_HASH_INVALID');
  assertHash64(record.canonical_hash, 'V4_CANONICAL_HASH_INVALID');
  if (!record.raw || typeof record.raw !== 'object' || Array.isArray(record.raw)) {
    fail('V4_RAW_EVIDENCE_REQUIRED');
  }
  if (!record.canonical || typeof record.canonical !== 'object' || Array.isArray(record.canonical)) {
    fail('V4_CANONICAL_EVIDENCE_REQUIRED');
  }

  if (record.canonical.raw_reference?.event_id !== record.raw_event_id) {
    fail('V4_RAW_REFERENCE_MISMATCH');
  }
  if (record.raw.event_id !== record.raw_event_id) {
    fail('V4_RAW_EVENT_LINKAGE_MISMATCH');
  }

  const canonical = record.canonical;
  const location = canonical.location;
  if (!location || typeof location !== 'object') fail('V4_CANONICAL_LOCATION_INVALID');
  assertBlock(location.block_number, 'V4_EVIDENCE_BLOCK_INVALID');
  if (location.block_number < fromBlock || location.block_number > toBlock) {
    fail('V4_EVIDENCE_RANGE_MISMATCH');
  }
  if (!Number.isSafeInteger(location.transaction_index) || location.transaction_index < 0) {
    fail('V4_TRANSACTION_INDEX_REQUIRED');
  }
  if (!Number.isSafeInteger(location.log_index) || location.log_index < 0) {
    fail('V4_LOG_INDEX_INVALID');
  }
  if (!BLOCK_HASH.test(location.block_hash || '')) fail('V4_BLOCK_HASH_REQUIRED');
  if (!TX_HASH.test(location.transaction_hash || '')) fail('V4_TRANSACTION_HASH_INVALID');
  if (canonical.identity_status !== 'COMPLETE') fail('V4_EVIDENCE_IDENTITY_INCOMPLETE');

  const rawHash = hashRawEvidence(record.raw);
  if (rawHash !== record.raw_hash) fail('V4_RAW_HASH_MISMATCH');

  const canonicalHash = hashCanonicalEvidence(canonical);
  if (canonicalHash !== record.canonical_hash) fail('V4_CANONICAL_HASH_MISMATCH');

  const identity = createEvidenceIdentity(canonical);
  if (
    identity.evidence_id !== record.evidence_id ||
    identity.identity_schema_version !== record.identity_schema_version ||
    identity.identity_hash !== record.identity_hash
  ) {
    fail('V4_EVIDENCE_IDENTITY_MISMATCH');
  }

  return {
    evidence_id: record.evidence_id,
    identity_schema_version: record.identity_schema_version,
    identity_hash: record.identity_hash,
    raw_event_id: record.raw_event_id,
    raw_hash: record.raw_hash,
    canonical_hash: record.canonical_hash,
    interpretation_status: canonical.interpretation_status,
    block_number: location.block_number,
    transaction_index: location.transaction_index,
    log_index: location.log_index,
    transaction_hash: location.transaction_hash,
    block_hash: location.block_hash,
  };
}

function deriveV4EvidenceCommitment({
  processingResult,
  evidenceRecords,
  allowEmptyResult = false,
}) {
  const result = assertAcceptedProcessingResult(processingResult);
  if (!Array.isArray(evidenceRecords)) fail('V4_EVIDENCE_RECORDS_REQUIRED');

  const expectedIds = new Set(result.canonicalEvidenceIds);
  const actualIds = new Set(evidenceRecords.map(record => record?.evidence_id));
  if (actualIds.size !== evidenceRecords.length) fail('V4_EVIDENCE_ID_DUPLICATE');

  for (const id of actualIds) {
    if (!expectedIds.has(id)) fail('V4_EVIDENCE_MEMBERSHIP_MISMATCH');
  }
  for (const id of expectedIds) {
    if (!actualIds.has(id)) fail('V4_EVIDENCE_MEMBERSHIP_INCOMPLETE');
  }

  if (evidenceRecords.length === 0) {
    if (!allowEmptyResult || result.emptyResult !== true) {
      fail('V4_EMPTY_EVIDENCE_NOT_EXPLICITLY_SUPPORTED');
    }
  } else if (result.emptyResult === true) {
    fail('V4_EMPTY_RESULT_CONFLICT');
  }

  const leaves = evidenceRecords.map(record =>
    validateEvidenceRecord(record, result.fromBlock, result.toBlock)
  );

  const seenKeys = new Set();
  for (const leaf of leaves) {
    const key = authorityKey({ canonical: { location: leaf }, raw_event_id: leaf.raw_event_id });
    if (seenKeys.has(key)) fail('V4_DUPLICATE_AUTHORITY_KEY');
    seenKeys.add(key);
  }

  leaves.sort((a, b) =>
    a.block_number - b.block_number ||
    a.transaction_index - b.transaction_index ||
    a.log_index - b.log_index ||
    a.raw_event_id.localeCompare(b.raw_event_id) ||
    a.evidence_id.localeCompare(b.evidence_id)
  );

  const leafHashes = leaves.map(leaf => hashDomain(LEAF_DOMAIN, leaf));

  const segmentPayload = {
    contract: SEGMENT_DOMAIN,
    from_block: String(result.fromBlock),
    to_block: String(result.toBlock),
    generation: result.generation,
    leaf_count: String(leafHashes.length),
    leaf_hashes: leafHashes,
  };
  const segmentDigest = hashDomain(SEGMENT_DOMAIN, segmentPayload);
  const segmentId = 'seg:v1:' + segmentDigest;

  const manifestPayload = {
    contract: MANIFEST_DOMAIN,
    from_block: String(result.fromBlock),
    to_block: String(result.toBlock),
    generation: result.generation,
    segment_id: segmentId,
    segment_digest: segmentDigest,
  };
  const manifestDigest = hashDomain(MANIFEST_DOMAIN, manifestPayload);
  const manifestId = 'manifest:v1:' + manifestDigest;

  const checkpointDigest = checkpointDigestFor(
    result.generation,
    manifestDigest
  );

  return Object.freeze({
    fromBlock: result.fromBlock,
    toBlock: result.toBlock,
    cursorBlock: result.toBlock,
    generation: result.generation,
    processingResultId: result.processingResultId,
    canonicalEvidenceCount: leaves.length,
    leafHashes: Object.freeze([...leafHashes]),
    segmentId,
    segmentDigest,
    manifestId,
    manifestDigest,
    checkpointDigest,
  });
}

module.exports = {
  LEAF_DOMAIN,
  SEGMENT_DOMAIN,
  MANIFEST_DOMAIN,
  deriveV4EvidenceCommitment,
};
