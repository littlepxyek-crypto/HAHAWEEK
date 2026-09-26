'use strict';

const crypto = require('node:crypto');
const { canonicalUtf8 } = require('../reference/v4/jcs');

const SCHEMA_VERSION = '1';
const IDENTITY_DOMAIN = 'HAHAWEEK-SURVEILLANCE-OBSERVATION-V1';

const OBSERVATION_TYPES = new Set([
  'LIQUIDITY_ACTIVITY',
  'WALLET_ACTIVITY',
  'TRANSACTION_COST',
  'CONTRACT_TRANSPARENCY',
  'PROMOTIONAL_PROVENANCE',
]);

const VALIDATION_STATUSES = new Set([
  'OBSERVED',
  'UNKNOWN',
  'INCONCLUSIVE',
  'UNVERIFIED',
  'CLAIMED',
  'CONFLICTING',
]);

function fail(message) {
  throw new TypeError(message);
}

function requiredObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(field + ' must be an object');
  }
}

function nonEmptyString(value, field) {
  if (typeof value !== 'string' || value.length === 0) {
    fail(field + ' must be a non-empty string');
  }
}

function safeChainId(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail('chain_id must be a non-negative safe integer');
  }
  return String(value);
}

function validTimestamp(value, field, nullable = false) {
  if (nullable && value === null) return;
  nonEmptyString(value, field);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    fail(field + ' must be a valid timestamp');
  }
}

function clone(value) {
  return structuredClone(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return value;
}

function canonicalEvidenceRefs(evidenceRefs) {
  if (!Array.isArray(evidenceRefs) || evidenceRefs.length === 0) {
    fail('evidence_refs must be a non-empty array');
  }

  const refs = [];
  const seen = new Set();

  for (const ref of evidenceRefs) {
    nonEmptyString(ref, 'evidence_refs entry');
    if (seen.has(ref)) {
      fail('evidence_refs must not contain duplicates');
    }
    seen.add(ref);
    refs.push(ref);
  }

  return refs.sort();
}

function createIdentityPayload(input, canonicalRefs) {
  return {
    schema_version: SCHEMA_VERSION,
    observation_type: input.observation_type,
    chain_id: safeChainId(input.chain_id),
    entity_ref: input.entity_ref,
    evidence_refs: canonicalRefs,
    provenance_ref: input.provenance_ref,
    event_time: input.event_time,
    observation_time: input.observation_time,
    rule_version: input.rule_version,
    validation_status: input.validation_status,
    uncertainty: input.uncertainty,
    payload: input.payload,
  };
}

function hashIdentity(identityPayload) {
  const bytes = canonicalUtf8(identityPayload);
  const preimage = Buffer.concat([
    Buffer.from(IDENTITY_DOMAIN, 'utf8'),
    Buffer.from([0x00]),
    bytes,
  ]);

  return crypto.createHash('sha256').update(preimage).digest('hex');
}

function createSurveillanceObservation(input) {
  requiredObject(input, 'input');

  if (!OBSERVATION_TYPES.has(input.observation_type)) {
    fail('unsupported observation_type');
  }

  if (!VALIDATION_STATUSES.has(input.validation_status)) {
    fail('unsupported validation_status');
  }

  safeChainId(input.chain_id);
  nonEmptyString(input.entity_ref, 'entity_ref');
  nonEmptyString(input.provenance_ref, 'provenance_ref');
  nonEmptyString(input.rule_version, 'rule_version');
  nonEmptyString(input.uncertainty, 'uncertainty');

  validTimestamp(input.event_time, 'event_time', true);
  validTimestamp(input.observation_time, 'observation_time');
  validTimestamp(input.processing_time, 'processing_time');

  if (input.event_time !== null && Date.parse(input.event_time) > Date.parse(input.observation_time)) {
    fail('event_time cannot be later than observation_time');
  }

  if (Date.parse(input.observation_time) > Date.parse(input.processing_time)) {
    fail('observation_time cannot be later than processing_time');
  }

  requiredObject(input.payload, 'payload');

  const evidenceRefs = canonicalEvidenceRefs(input.evidence_refs);

  const identityPayload = createIdentityPayload(input, evidenceRefs);
  const identityHash = hashIdentity(identityPayload);

  const observation = {
    schema_version: SCHEMA_VERSION,
    observation_id: 'so:v1:' + identityHash,
    observation_type: input.observation_type,
    chain_id: input.chain_id,
    entity_ref: input.entity_ref,
    evidence_refs: evidenceRefs,
    provenance_ref: input.provenance_ref,
    event_time: input.event_time,
    observation_time: input.observation_time,
    processing_time: input.processing_time,
    rule_version: input.rule_version,
    validation_status: input.validation_status,
    uncertainty: input.uncertainty,
    payload: clone(input.payload),
  };

  return deepFreeze(observation);
}

module.exports = {
  SCHEMA_VERSION,
  IDENTITY_DOMAIN,
  OBSERVATION_TYPES,
  VALIDATION_STATUSES,
  createIdentityPayload,
  hashIdentity,
  createSurveillanceObservation,
};
