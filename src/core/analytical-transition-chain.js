'use strict';

const { DOMAINS, createAnalyticalTransition } = require('./analytical-transition');
const { transitionHypothesis, linkValidationToHypothesis } = require('./formation-hypothesis-validation');

const SCHEMA_VERSION = 'analytical-transition-chain-v1';

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(name.toUpperCase() + '_REQUIRED');
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(name.toUpperCase() + '_REQUIRED');
}

function formationTransition(formation, previousState, nextState, evidenceIds, sequence, previousTransitionId = null) {
  return createAnalyticalTransition(DOMAINS.FORMATION, {
    entity_id: formation.formation_id,
    previous_state: previousState,
    next_state: nextState,
    reason: 'FORMATION_STATE_EVALUATED',
    evidence_ids: evidenceIds,
    temporal_context: {
      formation_start: formation.formation_start,
      formation_cutoff: formation.formation_end,
    },
    rule_version: formation.formation_rule_version,
    processing_context_id: 'formation-transition',
    provenance: formation.provenance_reference,
    sequence,
    previous_transition_id: previousTransitionId,
  });
}

function validationTransition(validation, previousState, nextState, sequence, previousTransitionId = null) {
  return createAnalyticalTransition(DOMAINS.VALIDATION, {
    entity_id: validation.validation_id,
    previous_state: previousState,
    next_state: nextState,
    reason: 'VALIDATION_STATE_EVALUATED',
    evidence_ids: validation.evidence_ids,
    temporal_context: {
      formation_cutoff: validation.formation_cutoff,
      evidence_temporal_context: validation.evidence_temporal_context,
    },
    rule_version: validation.validation_rule_version,
    processing_context_id: 'validation-transition',
    provenance: validation.provenance_reference,
    sequence,
    previous_transition_id: previousTransitionId,
  });
}

function hypothesisStateForValidation(result) {
  const mapping = {
    CONFIRMED: 'SUPPORTED',
    REJECTED: 'REFUTED',
    UNKNOWN: 'UNKNOWN',
    INCONCLUSIVE: 'INCONCLUSIVE',
  };
  if (!mapping[result]) throw new Error('VALIDATION_RESULT_INVALID');
  return mapping[result];
}

function buildAnalyticalTransitionChain(input) {
  requireObject(input, 'input');
  requireObject(input.formation, 'formation');
  requireObject(input.hypothesis, 'hypothesis');
  requireObject(input.validation, 'validation');
  requireString(input.formation.formation_id, 'formation_id');
  requireString(input.hypothesis.hypothesis_id, 'hypothesis_id');
  requireString(input.validation.validation_id, 'validation_id');

  if (input.formation.state !== 'VALID') throw new Error('FORMATION_CHAIN_REQUIRES_VALID');
  if (input.hypothesis.formation_id !== input.formation.formation_id) throw new Error('HYPOTHESIS_FORMATION_ID_MISMATCH');
  if (input.validation.formation_id !== input.formation.formation_id) throw new Error('VALIDATION_FORMATION_ID_MISMATCH');
  if (input.hypothesis.authority !== 'DERIVED') throw new Error('HYPOTHESIS_AUTHORITY_INVALID');

  const evidence = input.formation.evidence_ids;
  if (!Array.isArray(evidence) || evidence.length < 3) throw new Error('FORMATION_EVIDENCE_CHAIN_INCOMPLETE');

  const f1 = formationTransition(input.formation, 'OBSERVED', 'PARTIAL', evidence.slice(0, 1), 1);
  const f2 = formationTransition(input.formation, 'PARTIAL', 'CANDIDATE', evidence.slice(0, 2), 2, f1.transition_id);
  const f3 = formationTransition(input.formation, 'CANDIDATE', 'VALID', evidence, 3, f2.transition_id);

  const v1 = validationTransition(input.validation, 'PENDING', 'EVALUATING', 1);
  const v2 = validationTransition(input.validation, 'EVALUATING', input.validation.result, 2, v1.transition_id);

  const h = transitionHypothesis(input.hypothesis, hypothesisStateForValidation(input.validation.result), {
    reason: 'VALIDATION_RESULT_APPLIED',
    evidence_ids: input.validation.evidence_ids,
    sequence: 1,
  });

  return Object.freeze({
    schema_version: SCHEMA_VERSION,
    formation: Object.freeze([f1, f2, f3]),
    hypothesis: Object.freeze([h]),
    validation: Object.freeze([v1, v2]),
    linkage: linkValidationToHypothesis({ hypothesis: input.hypothesis, validation: input.validation }),
    authority: 'DERIVED',
  });
}

module.exports = { SCHEMA_VERSION, hypothesisStateForValidation, buildAnalyticalTransitionChain };
