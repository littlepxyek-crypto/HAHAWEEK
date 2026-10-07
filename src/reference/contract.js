'use strict';

const CONTRACT_VERSION = 'REFERENCE_INTELLIGENCE_CONTRACT_V1';
const OBSERVATION_VERSION = 'REFERENCE_OBSERVATION_V1';
const INDEPENDENCE = Object.freeze(['I0', 'I1', 'I2', 'I3', 'I4']);
const STATUS = Object.freeze([
  'REQUESTED', 'OBSERVED', 'PROVENANCE_RECORDED', 'CORROBORATED',
  'ANALYTICALLY_RELEVANT', 'VALIDATED', 'PARTIAL', 'UNKNOWN',
  'FAILED', 'EXPIRED', 'CONTRADICTED'
]);
const COMPLETENESS = Object.freeze(['COMPLETE', 'PARTIAL', 'UNKNOWN', 'FAILED', 'EXPIRED']);
const DERIVATION = Object.freeze(['OBSERVED', 'DERIVED', 'INFERRED']);

const TRANSITIONS = Object.freeze({
  REQUESTED: ['OBSERVED', 'PARTIAL', 'UNKNOWN', 'FAILED', 'EXPIRED'],
  OBSERVED: ['PROVENANCE_RECORDED', 'PARTIAL', 'UNKNOWN', 'FAILED', 'EXPIRED', 'CONTRADICTED'],
  PROVENANCE_RECORDED: ['CORROBORATED', 'ANALYTICALLY_RELEVANT', 'PARTIAL', 'UNKNOWN', 'FAILED', 'EXPIRED', 'CONTRADICTED'],
  CORROBORATED: ['ANALYTICALLY_RELEVANT', 'VALIDATED', 'CONTRADICTED', 'EXPIRED'],
  ANALYTICALLY_RELEVANT: ['VALIDATED', 'CONTRADICTED', 'EXPIRED'],
  VALIDATED: ['CONTRADICTED', 'EXPIRED'],
  PARTIAL: ['PROVENANCE_RECORDED', 'OBSERVED', 'EXPIRED'],
  UNKNOWN: ['OBSERVED', 'PROVENANCE_RECORDED', 'EXPIRED'],
  FAILED: ['REQUESTED', 'EXPIRED'],
  EXPIRED: [],
  CONTRADICTED: []
});

function assertString(value, code) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(code);
}

function assertIndependence(value) {
  if (!INDEPENDENCE.includes(value)) throw new Error('REFERENCE_INDEPENDENCE_INVALID');
}

function assertCompleteness(value) {
  if (!COMPLETENESS.includes(value)) throw new Error('REFERENCE_COMPLETENESS_INVALID');
}

function assertDerivation(value) {
  if (!DERIVATION.includes(value)) throw new Error('REFERENCE_DERIVATION_INVALID');
}

function assertStatus(value) {
  if (!STATUS.includes(value)) throw new Error('REFERENCE_STATUS_INVALID');
}

function assertStatusTransition(previous, next) {
  assertStatus(previous);
  assertStatus(next);
  if (!TRANSITIONS[previous].includes(next)) throw new Error('REFERENCE_STATUS_TRANSITION_INVALID');
}

module.exports = {
  CONTRACT_VERSION, OBSERVATION_VERSION, INDEPENDENCE, STATUS, COMPLETENESS, DERIVATION,
  TRANSITIONS, assertString, assertIndependence, assertCompleteness, assertDerivation,
  assertStatus, assertStatusTransition
};
