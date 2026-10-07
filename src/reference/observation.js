'use strict';

const crypto = require('node:crypto');
const { OBSERVATION_VERSION, assertString, assertIndependence, assertStatusTransition } = require('./contract');

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

  assertIndependence(input.independence_class || 'I0');

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
    as_of_time: input.as_of_time || null,
    source_reference: input.source_reference || null,
    payload_digest: input.payload_digest || digest(input.payload === undefined ? null : input.payload),
    payload: input.payload === undefined ? null : input.payload,
    provenance: input.provenance || null,
    limitations: input.limitations || [],
    completeness_status: input.completeness_status || 'UNKNOWN',
    error_status: input.error_status || null,
    derivation_status: input.derivation_status || 'OBSERVED',
    independence_class: input.independence_class || 'I0',
    status: input.status || 'OBSERVED',
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
      observation.independence_class === 'I0') {
    throw new Error('REFERENCE_INDEPENDENCE_UNKNOWN');
  }

  return Object.freeze(Object.assign({}, observation, {
    status: nextStatus,
    transition: {
      from: observation.status,
      to: nextStatus,
      reason: context.reason || null,
      processing_time: context.processing_time || new Date().toISOString(),
      rule_version: context.rule_version || 'reference-intelligence-v1',
      provenance_ref: context.provenance_ref || observation.observation_id
    }
  }));
}

module.exports = { canonicalize, digest, createReferenceObservation, transitionReferenceObservation };
