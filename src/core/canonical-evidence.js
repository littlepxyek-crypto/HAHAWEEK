'use strict';

const { createEvidenceIdentity } = require('./evidence-identity');

/**
 * Canonical Evidence v0.1
 *
 * This module creates a structured, traceable projection of one immutable
 * raw log record. It does not decode protocol semantics and does not mutate
 * the raw record.
 */

const INTERPRETATION_STATUSES = new Set([
  'UNINTERPRETED',
  'MATCHED',
  'NO_MATCH',
  'UNKNOWN',
  'INVALID',
]);

function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`INVALID_${name.toUpperCase()}`);
  }
}

function requireNonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`INVALID_${name.toUpperCase()}`);
  }
}

function normalizeHex(value, name) {
  requireString(value, name);
  if (!/^0x[0-9a-fA-F]+$/i.test(value)) {
    throw new Error(`INVALID_${name.toUpperCase()}`);
  }
  return value.toLowerCase();
}

function createCanonicalEvidence(raw, options = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('RAW_EVIDENCE_REQUIRED');
  }

  requireString(raw.event_id, 'event_id');
  requireNonNegativeInteger(raw.chain_id, 'chain_id');
  requireNonNegativeInteger(raw.block_number, 'block_number');
  requireString(raw.transaction_hash, 'transaction_hash');
  requireNonNegativeInteger(raw.log_index, 'log_index');
  requireString(raw.address, 'address');
  requireString(raw.data, 'data');
  if (!Array.isArray(raw.topics)) {
    throw new Error('INVALID_TOPICS');
  }

  const interpretationStatus =
    options.interpretation_status ?? 'UNINTERPRETED';

  if (!INTERPRETATION_STATUSES.has(interpretationStatus)) {
    throw new Error('INVALID_INTERPRETATION_STATUS');
  }

  const canonical = {
    evidence_id: null,
    identity_reference: null,
    identity_status: 'INCOMPLETE',
    evidence_type: 'RAW_LOG',
    chain_id: raw.chain_id,
    location: {
      block_number: raw.block_number,
      block_hash: raw.block_hash == null
        ? null
        : normalizeHex(raw.block_hash, 'block_hash'),
      transaction_hash: normalizeHex(
        raw.transaction_hash,
        'transaction_hash'
      ),
      transaction_index: raw.transaction_index == null
        ? null
        : raw.transaction_index,
      log_index: raw.log_index,
    },
    contract_address: normalizeHex(raw.address, 'address'),
    topics: raw.topics.map((topic, index) =>
      normalizeHex(topic, `topic_${index}`)
    ),
    data: raw.data,
    raw_reference: {
      event_id: raw.event_id,
    },
    interpretation_status: interpretationStatus,
    provenance_reference: {
      raw_event_id: raw.event_id,
      chain_id: raw.chain_id,
    },
  };

  if (
    canonical.location.transaction_index !== null &&
    (!Number.isInteger(canonical.location.transaction_index) ||
      canonical.location.transaction_index < 0)
  ) {
    throw new Error('INVALID_TRANSACTION_INDEX');
  }

  if (
    canonical.location.block_hash !== null &&
    canonical.location.transaction_index !== null
  ) {
    const identity = createEvidenceIdentity(canonical);
    canonical.evidence_id = identity.evidence_id;
    canonical.identity_reference = identity;
    canonical.identity_status = 'COMPLETE';
  }

  return canonical;
}

module.exports = {
  INTERPRETATION_STATUSES,
  createCanonicalEvidence,
};
