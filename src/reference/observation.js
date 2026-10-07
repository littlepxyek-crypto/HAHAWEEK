'use strict';

const crypto = require('node:crypto');
const {
  OBSERVATION_VERSION,
  assertString,
  assertIndependence,
  assertCompleteness,
  assertDerivation,
  assertStatus,
  assertStatusTransition
} = require('./contract');

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
}

function digest(value) {
  return crypto.createHash('sha256').update(canonicalize(value)).digest('hex');
}

function createReferenceObservation(input) {
  if (!input || typeof input !== 'object') throw new Error('REFERENCE_OBSERVATION_REQUIRED');

  for (const [key, code] of [
    ['provider_id', 'PROVIDER_ID_REQUIRED'],
    ['provider_type', 'PROVIDER_TYPE_REQUIRED'],
    ['request_id', 'REQUEST_ID_REQUIRED'],
    ['acquisition_id', 'ACQUISITION_ID_REQUIRED'],
    ['subject', 'SUBJECT_REQUIRED'],
    ['retrieval_time', 'RETRIEVAL_TIME_REQUIRED']
  ]) assertString(input[key], code);

  const completenessStatus = input.completeness_status || 'UNKNOWN';
  const derivationStatus = input.derivation_status || 'OBSERVED';
  const status = input.status || 'OBSERVED';

  assertIndependence(input.independence_class || 'I0');
  assertCompleteness(completenessStatus);
  assertDerivation(derivationStatus);
  assertStatus(status);

  const observation = {
    schema_version: OBSERVATION_VERSION,
    observation_id: input.observation_id || 'rio:v1:' + digest({
      provider_id: input.provider_id,
      request_id: input.request_id,
      acquisition_id: input.acquisition_id,
      subject: input.subject,
      payload: input.payload === undefined ? null : input.payload,
      retrieval_time: input.retrieval_time
    }),
    provider_id: input.provider_id,
    provider_type: input.provider_type,
    provider_version: input.provider_version || null,
    request_id: input.request_id,
    acquisition_id: input.acquisition_id,
    subject: input.subject,
    observation_time: input.observation_time || null,
    retrieval_time: input.retrieval_time,
    processing_time: input.processing_time || null,
    as_of_time: input.as_of_time || null,
    source_reference: input.source_reference || null,
    payload_digest: input.payload_digest || digest(input.payload === undefined ? null : input.payload),
    payload: input.payload === undefined ? null : input.payload,
    provenance: input.provenance || null,
    limitations: Array.isArray(input.limitations) ? input.limitations.slice() : [],
    completeness_status: completenessStatus,
    error_status: input.error_status || null,
    derivation_status: derivationStatus,
    independence_class: input.independence_class || 'I0',
    status,
    lineage: input.lineage || null
  };

  return Object.freeze(observation);
}

function transitionReferenceObservation(observation, nextStatus, context) {
  context = context || {};
  if (!observation || typeof observation !== 'object') throw new Error('REFERENCE_OBSERVATION_REQUIRED');
  assertStatusTransition(observation.status, nextStatus);

  if (nextStatus === 'PROVENANCE_RECORDED' && !observation.provenance) {
    throw new Error('REFERENCE_PROVENANCE_REQUIRED');
  }

  if (['CORROBORATED', 'ANALYTICALLY_RELEVANT', 'VALIDATED'].includes(nextStatus) &&
      !['I3', 'I4'].includes(observation.independence_class)) {
    throw new Error('REFERENCE_INDEPENDENCE_NOT_SUFFICIENT');
  }

  if (nextStatus === 'VALIDATED') {
    if (!context.validation_ref || !context.validation_rule_version) {
      throw new Error('REFERENCE_VALIDATION_CONTEXT_REQUIRED');
    }
  }

  return Object.freeze(Object.assign({}, observation, {
    status: nextStatus,
    transition: {
      from: observation.status,
      to: nextStatus,
      reason: context.reason || null,
      processing_time: context.processing_time || new Date().toISOString(),
      rule_version: context.rule_version || 'reference-intelligence-v1',
      provenance_ref: context.provenance_ref || observation.observation_id,
      validation_ref: context.validation_ref || null,
      validation_rule_version: context.validation_rule_version || null
    }
  }));
}

module.exports = { canonicalize, digest, createReferenceObservation, transitionReferenceObservation };
