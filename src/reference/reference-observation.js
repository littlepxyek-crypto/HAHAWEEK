'use strict';

const crypto = require('node:crypto');

const OBSERVATION_STATUS = Object.freeze([
  'REQUESTED','OBSERVED','PARTIAL','UNKNOWN','FAILED','EXPIRED',
  'CORROBORATED','ANALYTICALLY_RELEVANT','VALIDATED','CONTRADICTED',
]);

const INDEPENDENCE_CLASSES = Object.freeze([
  'I0_UNKNOWN','I1_DERIVED_SAME_LINEAGE','I2_CORRELATED',
  'I3_INDEPENDENT','I4_DIRECTLY_INDEPENDENT',
]);

const ALLOWED_TRANSITIONS = Object.freeze({
  REQUESTED: new Set(['OBSERVED','PARTIAL','UNKNOWN','FAILED','EXPIRED']),
  OBSERVED: new Set(['CORROBORATED','ANALYTICALLY_RELEVANT','VALIDATED','CONTRADICTED']),
  CORROBORATED: new Set(['ANALYTICALLY_RELEVANT','VALIDATED','CONTRADICTED']),
  ANALYTICALLY_RELEVANT: new Set(['VALIDATED','CONTRADICTED']),
  PARTIAL: new Set([]), UNKNOWN: new Set([]), FAILED: new Set([]),
  EXPIRED: new Set([]), VALIDATED: new Set([]), CONTRADICTED: new Set([]),
});

function assertNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('REFERENCE_OBSERVATION_' + field.toUpperCase() + '_REQUIRED');
  }
}

function stableSerialize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableSerialize).join(',') + ']';
  return '{' + Object.keys(value).sort().map(function (key) {
    return JSON.stringify(key) + ':' + stableSerialize(value[key]);
  }).join(',') + '}';
}

function digestPayload(payload) {
  return crypto.createHash('sha256').update(stableSerialize(payload)).digest('hex');
}

function assertTimestamp(value, field) {
  assertNonEmptyString(value, field);
  if (Number.isNaN(Date.parse(value))) {
    throw new Error('REFERENCE_OBSERVATION_' + field.toUpperCase() + '_INVALID');
  }
}

function classifyIndependence(provenance) {
  if (!provenance || typeof provenance !== 'object') return 'I0_UNKNOWN';
  if (typeof provenance.independence_classification === 'string' &&
      INDEPENDENCE_CLASSES.includes(provenance.independence_classification)) {
    return provenance.independence_classification;
  }
  if (provenance.derived === true) return 'I1_DERIVED_SAME_LINEAGE';
  return 'I0_UNKNOWN';
}

function createReferenceObservation(input) {
  if (!input || typeof input !== 'object') throw new Error('REFERENCE_OBSERVATION_INPUT_REQUIRED');
  ['provider_id','provider_type','request_id','acquisition_id','subject','source_reference']
    .forEach(function (field) { assertNonEmptyString(input[field], field); });
  ['observation_time','retrieval_time','as_of_time']
    .forEach(function (field) { assertTimestamp(input[field], field); });

  if (!OBSERVATION_STATUS.includes(input.status)) throw new Error('REFERENCE_OBSERVATION_STATUS_INVALID');
  if (!input.provenance || typeof input.provenance !== 'object') {
    throw new Error('REFERENCE_OBSERVATION_PROVENANCE_REQUIRED');
  }
  if (!input.provider_payload || typeof input.provider_payload !== 'object') {
    throw new Error('REFERENCE_OBSERVATION_PROVIDER_PAYLOAD_REQUIRED');
  }

  const payloadDigest = digestPayload(input.provider_payload);
  if (input.payload_digest && input.payload_digest !== payloadDigest) {
    throw new Error('REFERENCE_OBSERVATION_PAYLOAD_DIGEST_MISMATCH');
  }

  return Object.freeze({
    schema_version: input.schema_version || 'REFERENCE_OBSERVATION_V1',
    provider_id: input.provider_id,
    provider_type: input.provider_type,
    provider_version: input.provider_version || 'UNKNOWN',
    request_id: input.request_id,
    acquisition_id: input.acquisition_id,
    subject: input.subject,
    observation_time: input.observation_time,
    retrieval_time: input.retrieval_time,
    as_of_time: input.as_of_time,
    source_reference: input.source_reference,
    payload_digest: payloadDigest,
    provenance: structuredClone(input.provenance),
    limitations: Array.isArray(input.limitations) ? input.limitations.slice() : [],
    completeness_status: input.completeness_status || 'UNKNOWN',
    error_status: input.error_status || null,
    derivation_status: input.derivation_status || 'UNKNOWN',
    independence_classification: classifyIndependence(input.provenance),
    status: input.status,
    provider_payload: structuredClone(input.provider_payload),
  });
}

function transitionReferenceObservation(observation, nextStatus) {
  if (!observation || typeof observation !== 'object') throw new Error('REFERENCE_OBSERVATION_REQUIRED');
  if (!OBSERVATION_STATUS.includes(nextStatus)) throw new Error('REFERENCE_OBSERVATION_STATUS_INVALID');
  const allowed = ALLOWED_TRANSITIONS[observation.status] || new Set();
  if (!allowed.has(nextStatus)) throw new Error('REFERENCE_OBSERVATION_ILLEGAL_TRANSITION');
  return Object.freeze(Object.assign({}, observation, { status: nextStatus }));
}

function isUncertainObservationStatus(status) {
  return ['PARTIAL','UNKNOWN','FAILED','EXPIRED','CONTRADICTED'].includes(status);
}

module.exports = {
  OBSERVATION_STATUS,
  INDEPENDENCE_CLASSES,
  createReferenceObservation,
  transitionReferenceObservation,
  isUncertainObservationStatus,
  digestPayload,
};
