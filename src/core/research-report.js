'use strict';

const crypto = require('node:crypto');

const REPORT_SCHEMA_VERSION = '1';
const REPORT_RULE_VERSION = 'research-report-v1';
const VALID_VALIDATION_RESULTS = new Set(['CONFIRMED', 'REJECTED', 'INCONCLUSIVE']);

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

function canonicalClaim(claim) {
  requireObject(claim, 'claim');
  requireString(claim.claim_id, 'claim_id');
  requireString(claim.statement, 'statement');
  if (!Array.isArray(claim.evidence_ids)) throw new Error('CLAIM_EVIDENCE_IDS_REQUIRED');
  for (const evidenceId of claim.evidence_ids) requireString(evidenceId, 'evidence_id');
  return {
    claim_id: claim.claim_id,
    statement: claim.statement,
    evidence_ids: [...claim.evidence_ids],
  };
}

function reportId(payload) {
  return `report:v1:${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}

function createResearchReport(input) {
  requireObject(input, 'input');
  requireObject(input.formation, 'formation');
  requireObject(input.outcome, 'outcome');
  requireObject(input.validation, 'validation');

  requireString(input.formation.formation_id, 'formation_id');
  requireString(input.formation.formation_rule_version, 'formation_rule_version');
  requireString(input.outcome.outcome_id, 'outcome_id');
  requireString(input.outcome.formation_id, 'outcome_formation_id');
  requireString(input.validation.validation_id, 'validation_id');
  requireString(input.validation.formation_id, 'validation_formation_id');
  requireString(input.validation.outcome_id, 'validation_outcome_id');

  if (input.outcome.formation_id !== input.formation.formation_id) {
    throw new Error('OUTCOME_FORMATION_ID_MISMATCH');
  }
  if (input.validation.formation_id !== input.formation.formation_id) {
    throw new Error('VALIDATION_FORMATION_ID_MISMATCH');
  }
  if (input.validation.outcome_id !== input.outcome.outcome_id) {
    throw new Error('VALIDATION_OUTCOME_ID_MISMATCH');
  }

  if (!VALID_VALIDATION_RESULTS.has(input.validation.result)) {
    throw new Error('INVALID_VALIDATION_RESULT');
  }

  if (!Array.isArray(input.claims) || input.claims.length === 0) {
    throw new Error('CLAIMS_REQUIRED');
  }
  const claims = input.claims.map(canonicalClaim);

  const evidenceIds = [...new Set([
    ...claims.flatMap((claim) => claim.evidence_ids),
    ...(Array.isArray(input.formation.evidence_ids) ? input.formation.evidence_ids : []),
    ...(Array.isArray(input.outcome.evidence_ids) ? input.outcome.evidence_ids : []),
    ...(Array.isArray(input.validation.evidence_ids) ? input.validation.evidence_ids : []),
  ])];

  const provenance = input.provenance_reference ?? {
    formation_id: input.formation.formation_id,
    outcome_id: input.outcome.outcome_id,
    validation_id: input.validation.validation_id,
    evidence_ids: evidenceIds,
  };
  requireObject(provenance, 'provenance_reference');

  const identityPayload = {
    schema_version: REPORT_SCHEMA_VERSION,
    report_rule_version: input.report_rule_version ?? REPORT_RULE_VERSION,
    formation_id: input.formation.formation_id,
    outcome_id: input.outcome.outcome_id,
    validation_id: input.validation.validation_id,
    validation_result: input.validation.result,
    claims,
    evidence_ids: evidenceIds,
  };

  return {
    report_id: reportId(identityPayload),
    report_rule_version: input.report_rule_version ?? REPORT_RULE_VERSION,
    formation_id: input.formation.formation_id,
    outcome_id: input.outcome.outcome_id,
    validation_id: input.validation.validation_id,
    validation_result: input.validation.result,
    claims,
    evidence_ids: evidenceIds,
    provenance_reference: provenance,
  };
}

module.exports = {
  REPORT_SCHEMA_VERSION,
  REPORT_RULE_VERSION,
  VALID_VALIDATION_RESULTS,
  createResearchReport,
};
