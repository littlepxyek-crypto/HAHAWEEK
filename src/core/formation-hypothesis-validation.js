'use strict';

const crypto = require('node:crypto');
const {
  DOMAINS,
  createAnalyticalTransition,
} = require('./analytical-transition');

const FORMATION_HYPOTHESIS_VALIDATION_SCHEMA_VERSION = '1';
const HYPOTHESIS_RULE_VERSION = 'hypothesis-v1';

const HYPOTHESIS_STATES = Object.freeze([
  'PROPOSED',
  'SUPPORTED',
  'REFUTED',
  'UNKNOWN',
  'INCONCLUSIVE',
]);

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name.toUpperCase()}_REQUIRED`);
  }
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name.toUpperCase()}_REQUIRED`);
  }
}

function hypothesisId(input) {
  const payload = {
    schema_version: FORMATION_HYPOTHESIS_VALIDATION_SCHEMA_VERSION,
    rule_version: input.rule_version ?? HYPOTHESIS_RULE_VERSION,
    formation_id: input.formation_id,
    statement: input.statement,
  };
  return `hypothesis:v1:${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}

function createHypothesis(input) {
  requireObject(input, 'input');
  requireString(input.formation_id, 'formation_id');
  requireString(input.statement, 'statement');
  requireString(input.rule_version ?? HYPOTHESIS_RULE_VERSION, 'rule_version');
  requireString(input.processing_context_id, 'processing_context_id');
  requireObject(input.temporal_context, 'temporal_context');
  requireObject(input.provenance, 'provenance');

  if (input.formation_state !== 'VALID') {
    throw new Error('HYPOTHESIS_REQUIRES_VALID_FORMATION');
  }
  if (!Array.isArray(input.evidence_ids) || input.evidence_ids.length === 0) {
    throw new Error('HYPOTHESIS_EVIDENCE_IDS_REQUIRED');
  }
  input.evidence_ids.forEach((id) => requireString(id, 'evidence_id'));

  const ruleVersion = input.rule_version ?? HYPOTHESIS_RULE_VERSION;
  const id = hypothesisId({ ...input, rule_version: ruleVersion });

  return Object.freeze({
    hypothesis_id: id,
    schema_version: FORMATION_HYPOTHESIS_VALIDATION_SCHEMA_VERSION,
    rule_version: ruleVersion,
    formation_id: input.formation_id,
    statement: input.statement,
    state: 'PROPOSED',
    evidence_ids: [...input.evidence_ids],
    temporal_context: input.temporal_context,
    processing_context_id: input.processing_context_id,
    provenance: input.provenance,
    authority: 'DERIVED',
  });
}

function transitionHypothesis(hypothesis, nextState, input = {}) {
  requireObject(hypothesis, 'hypothesis');
  requireString(hypothesis.hypothesis_id, 'hypothesis_id');
  requireString(nextState, 'next_state');

  if (!HYPOTHESIS_STATES.includes(hypothesis.state)) {
    throw new Error('HYPOTHESIS_STATE_INVALID');
  }
  if (hypothesis.authority !== 'DERIVED') {
    throw new Error('HYPOTHESIS_AUTHORITY_INVALID');
  }

  return createAnalyticalTransition(DOMAINS.HYPOTHESIS, {
    entity_id: hypothesis.hypothesis_id,
    previous_state: hypothesis.state,
    next_state: nextState,
    reason: input.reason ?? 'HYPOTHESIS_STATE_EVALUATED',
    evidence_ids: input.evidence_ids ?? hypothesis.evidence_ids,
    temporal_context: input.temporal_context ?? hypothesis.temporal_context,
    rule_version: input.rule_version ?? hypothesis.rule_version,
    processing_context_id: input.processing_context_id ?? hypothesis.processing_context_id,
    provenance: input.provenance ?? hypothesis.provenance,
    sequence: input.sequence ?? null,
    previous_transition_id: input.previous_transition_id ?? null,
  });
}

function assertValidationInput(input) {
  requireObject(input, 'input');
  requireObject(input.hypothesis, 'hypothesis');
  requireObject(input.validation, 'validation');
  requireString(input.hypothesis.hypothesis_id, 'hypothesis_id');
  requireString(input.validation.validation_id, 'validation_id');

  if (input.hypothesis.authority !== 'DERIVED') {
    throw new Error('HYPOTHESIS_AUTHORITY_INVALID');
  }

  const allowed = new Set(['CONFIRMED', 'REJECTED', 'UNKNOWN', 'INCONCLUSIVE']);
  if (!allowed.has(input.validation.result)) {
    throw new Error('VALIDATION_RESULT_INVALID');
  }

  if (input.validation.hypothesis_id !== undefined &&
      input.validation.hypothesis_id !== input.hypothesis.hypothesis_id) {
    throw new Error('VALIDATION_HYPOTHESIS_ID_MISMATCH');
  }
}

function linkValidationToHypothesis(input) {
  assertValidationInput(input);
  return Object.freeze({
    relationship: 'HYPOTHESIS_VALIDATION',
    hypothesis_id: input.hypothesis.hypothesis_id,
    validation_id: input.validation.validation_id,
    validation_result: input.validation.result,
    evidence_ids: Array.isArray(input.validation.evidence_ids)
      ? [...input.validation.evidence_ids]
      : [],
    authority: 'DERIVED',
  });
}

module.exports = {
  FORMATION_HYPOTHESIS_VALIDATION_SCHEMA_VERSION,
  HYPOTHESIS_RULE_VERSION,
  HYPOTHESIS_STATES,
  createHypothesis,
  transitionHypothesis,
  linkValidationToHypothesis,
};
