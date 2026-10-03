'use strict';

const crypto = require('node:crypto');

const VALIDATION_SCHEMA_VERSION = '2';
const VALIDATION_RULE_VERSION = 'validation-v2';
const RESULTS = new Set(['CONFIRMED', 'REJECTED', 'UNKNOWN', 'INCONCLUSIVE']);
const CRITERION_STATUSES = new Set(['PASS', 'FAIL', 'UNKNOWN', 'INCONCLUSIVE']);
const TEMPORAL_ROLES = new Set(['FORMATION', 'OUTCOME']);

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

function canonicalCriterion(criterion) {
  requireObject(criterion, 'criterion');
  requireString(criterion.criterion_id, 'criterion_id');
  if (!CRITERION_STATUSES.has(criterion.status)) {
    throw new Error('INVALID_CRITERION_STATUS');
  }
  if (!Array.isArray(criterion.evidence_ids)) {
    throw new Error('CRITERION_EVIDENCE_IDS_REQUIRED');
  }
  for (const evidenceId of criterion.evidence_ids) requireString(evidenceId, 'evidence_id');
  return {
    criterion_id: criterion.criterion_id,
    status: criterion.status,
    evidence_ids: [...criterion.evidence_ids],
    detail: criterion.detail ?? null,
  };
}

function requireTemporalEvidence(input, formationCutoff) {
  requireString(formationCutoff, 'formation_cutoff');
  const cutoff = Date.parse(formationCutoff);
  if (!Number.isFinite(cutoff)) throw new Error('INVALID_FORMATION_CUTOFF');
  if (!Array.isArray(input.evidence_temporal_context)) {
    throw new Error('EVIDENCE_TEMPORAL_CONTEXT_REQUIRED');
  }

  return input.evidence_temporal_context.map((item) => {
    requireObject(item, 'evidence_temporal_context');
    requireString(item.evidence_id, 'evidence_id');
    requireString(item.event_time, 'event_time');
    const eventTime = Date.parse(item.event_time);
    if (!Number.isFinite(eventTime)) throw new Error('INVALID_EVIDENCE_EVENT_TIME');

    const roles = item.roles ?? [item.role ?? 'FORMATION'];
    if (!Array.isArray(roles) || roles.length === 0 || roles.some((role) => !TEMPORAL_ROLES.has(role))) {
      throw new Error('INVALID_EVIDENCE_TEMPORAL_ROLE');
    }

    // Formation evidence is the historical input to the formation assessment.
    // Outcome evidence may legitimately occur after formation_cutoff because it
    // measures the post-formation outcome being validated. It must never be
    // reclassified as formation evidence.
    if (roles.includes('FORMATION') && eventTime > cutoff) {
      throw new Error('FUTURE_EVIDENCE_RELATIVE_TO_FORMATION_CUTOFF');
    }

    return {
      evidence_id: item.evidence_id,
      event_time: item.event_time,
      roles: [...roles],
    };
  });
}

function validationId(payload) {
  return `validation:v2:${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}

function createValidationResult(input) {
  requireObject(input, 'input');
  requireString(input.formation_id, 'formation_id');
  requireString(input.formation_rule_version, 'formation_rule_version');
  requireString(input.outcome_id, 'outcome_id');
  requireString(input.outcome_rule_version, 'outcome_rule_version');
  requireString(input.validation_rule_version ?? VALIDATION_RULE_VERSION, 'validation_rule_version');

  const formationCutoff = input.formation_cutoff;
  const temporalContext = requireTemporalEvidence(input, formationCutoff);

  requireObject(input.formation, 'formation');
  requireObject(input.outcome, 'outcome');

  if (input.formation.formation_id !== input.formation_id) throw new Error('FORMATION_ID_MISMATCH');
  if (input.formation.formation_rule_version !== input.formation_rule_version) {
    throw new Error('FORMATION_RULE_VERSION_MISMATCH');
  }
  if (input.outcome.outcome_id !== input.outcome_id) throw new Error('OUTCOME_ID_MISMATCH');
  if (input.outcome.outcome_rule_version !== input.outcome_rule_version) {
    throw new Error('OUTCOME_RULE_VERSION_MISMATCH');
  }

  if (!Array.isArray(input.criteria_results) || input.criteria_results.length === 0) {
    throw new Error('CRITERIA_RESULTS_REQUIRED');
  }

  const criteriaResults = input.criteria_results.map(canonicalCriterion);
  const outcomeCoverage = input.outcome.coverage_status;
  if (!['COMPLETE', 'PARTIAL', 'UNKNOWN'].includes(outcomeCoverage)) {
    throw new Error('INVALID_OUTCOME_COVERAGE');
  }

  let result = 'CONFIRMED';
  if (outcomeCoverage === 'UNKNOWN' || criteriaResults.some((criterion) => criterion.status === 'UNKNOWN')) {
    result = 'UNKNOWN';
  } else if (outcomeCoverage !== 'COMPLETE' || criteriaResults.some((criterion) => criterion.status === 'INCONCLUSIVE')) {
    result = 'INCONCLUSIVE';
  } else if (criteriaResults.some((criterion) => criterion.status === 'FAIL')) {
    result = 'REJECTED';
  }

  const evidenceIds = [...new Set([
    ...criteriaResults.flatMap((criterion) => criterion.evidence_ids),
    ...(Array.isArray(input.outcome.evidence_ids) ? input.outcome.evidence_ids : []),
  ])];

  const temporalById = new Map(temporalContext.map((item) => [item.evidence_id, item]));
  for (const evidenceId of evidenceIds) {
    if (!temporalById.has(evidenceId)) throw new Error('EVIDENCE_TEMPORAL_CONTEXT_INCOMPLETE');
  }

  // Every evidence explicitly attached to the formation itself must remain
  // formation-scoped and therefore cannot occur after the formation cutoff.
  const formationEvidenceIds = Array.isArray(input.formation.evidence_ids)
    ? input.formation.evidence_ids
    : [];
  for (const evidenceId of formationEvidenceIds) {
    const context = temporalById.get(evidenceId);
    if (!context) throw new Error('EVIDENCE_TEMPORAL_CONTEXT_INCOMPLETE');
    if (!context.roles.includes('FORMATION')) throw new Error('FORMATION_EVIDENCE_ROLE_REQUIRED');
  }

  const uncertainties = input.uncertainties ?? [];
  if (!Array.isArray(uncertainties)) throw new Error('UNCERTAINTIES_REQUIRED');
  for (const uncertainty of uncertainties) requireString(uncertainty, 'uncertainty');

  const provenance = input.provenance_reference ?? {
    formation_id: input.formation_id,
    outcome_id: input.outcome_id,
    evidence_ids: evidenceIds,
  };
  requireObject(provenance, 'provenance_reference');

  const identityPayload = {
    schema_version: VALIDATION_SCHEMA_VERSION,
    validation_rule_version: input.validation_rule_version ?? VALIDATION_RULE_VERSION,
    formation_id: input.formation_id,
    formation_rule_version: input.formation_rule_version,
    outcome_id: input.outcome_id,
    outcome_rule_version: input.outcome_rule_version,
    result,
    criteria_results: criteriaResults,
    evidence_ids: evidenceIds,
    uncertainties,
    formation_cutoff: formationCutoff,
    evidence_temporal_context: temporalContext,
  };

  return {
    validation_id: validationId(identityPayload),
    formation_id: input.formation_id,
    formation_rule_version: input.formation_rule_version,
    outcome_id: input.outcome_id,
    outcome_rule_version: input.outcome_rule_version,
    validation_rule_version: input.validation_rule_version ?? VALIDATION_RULE_VERSION,
    result,
    criteria_results: criteriaResults,
    evidence_ids: evidenceIds,
    uncertainties,
    formation_cutoff: formationCutoff,
    evidence_temporal_context: temporalContext,
    provenance_reference: provenance,
  };
}

module.exports = {
  VALIDATION_SCHEMA_VERSION,
  VALIDATION_RULE_VERSION,
  RESULTS,
  CRITERION_STATUSES,
  TEMPORAL_ROLES,
  createValidationResult,
};
