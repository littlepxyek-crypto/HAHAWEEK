'use strict';

const crypto = require('node:crypto');

const VALIDATION_SCHEMA_VERSION = '1';
const VALIDATION_RULE_VERSION = 'validation-v1';
const RESULTS = new Set(['CONFIRMED', 'REJECTED', 'INCONCLUSIVE']);
const CRITERION_STATUSES = new Set(['PASS', 'FAIL', 'INCONCLUSIVE']);

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
  for (const evidenceId of criterion.evidence_ids) {
    requireString(evidenceId, 'evidence_id');
  }
  return {
    criterion_id: criterion.criterion_id,
    status: criterion.status,
    evidence_ids: [...criterion.evidence_ids],
    detail: criterion.detail ?? null,
  };
}

function validationId(payload) {
  return `validation:v1:${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}

function createValidationResult(input) {
  requireObject(input, 'input');
  requireString(input.formation_id, 'formation_id');
  requireString(input.formation_rule_version, 'formation_rule_version');
  requireString(input.outcome_id, 'outcome_id');
  requireString(input.outcome_rule_version, 'outcome_rule_version');
  requireString(input.validation_rule_version ?? VALIDATION_RULE_VERSION, 'validation_rule_version');

  requireObject(input.formation, 'formation');
  requireObject(input.outcome, 'outcome');

  if (input.formation.formation_id !== input.formation_id) {
    throw new Error('FORMATION_ID_MISMATCH');
  }
  if (input.formation.formation_rule_version !== input.formation_rule_version) {
    throw new Error('FORMATION_RULE_VERSION_MISMATCH');
  }
  if (input.outcome.outcome_id !== input.outcome_id) {
    throw new Error('OUTCOME_ID_MISMATCH');
  }
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
  if (outcomeCoverage !== 'COMPLETE' || criteriaResults.some((criterion) => criterion.status === 'INCONCLUSIVE')) {
    result = 'INCONCLUSIVE';
  } else if (criteriaResults.some((criterion) => criterion.status === 'FAIL')) {
    result = 'REJECTED';
  }

  const evidenceIds = [...new Set([
    ...criteriaResults.flatMap((criterion) => criterion.evidence_ids),
    ...(Array.isArray(input.outcome.evidence_ids) ? input.outcome.evidence_ids : []),
  ])];

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
    provenance_reference: provenance,
  };
}

module.exports = {
  VALIDATION_SCHEMA_VERSION,
  VALIDATION_RULE_VERSION,
  RESULTS,
  CRITERION_STATUSES,
  createValidationResult,
};
