'use strict';

const crypto = require('node:crypto');

const SUMMARY_SCHEMA_VERSION = '1';
const SUMMARY_RULE_VERSION = 'intelligence-evidence-summary-v1';

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
}

function requireIds(value, name) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
  const seen = new Set();
  for (const id of value) {
    requireString(id, name);
    if (seen.has(id)) throw new TypeError(name.toUpperCase() + '_DUPLICATE');
    seen.add(id);
  }
  return [...value];
}

function createIntelligenceEvidenceSummary(input) {
  requireObject(input, 'input');
  requireObject(input.intelligence, 'intelligence');
  requireObject(input.formation, 'formation');
  requireObject(input.outcome, 'outcome');
  requireObject(input.validation, 'validation');

  requireString(input.intelligence.intelligence_id, 'intelligence_id');
  requireString(input.intelligence.formation_id, 'intelligence_formation_id');
  requireString(input.intelligence.outcome_id, 'intelligence_outcome_id');
  requireString(input.intelligence.validation_id, 'intelligence_validation_id');
  requireString(input.formation.formation_id, 'formation_id');
  requireString(input.outcome.outcome_id, 'outcome_id');
  requireString(input.validation.validation_id, 'validation_id');

  if (input.intelligence.formation_id !== input.formation.formation_id) {
    throw new TypeError('INTELLIGENCE_FORMATION_ID_MISMATCH');
  }
  if (input.intelligence.outcome_id !== input.outcome.outcome_id) {
    throw new TypeError('INTELLIGENCE_OUTCOME_ID_MISMATCH');
  }
  if (input.intelligence.validation_id !== input.validation.validation_id) {
    throw new TypeError('INTELLIGENCE_VALIDATION_ID_MISMATCH');
  }

  const evidenceIds = requireIds(input.intelligence.evidence_ids, 'evidence_ids');
  const identityPayload = {
    schema_version: SUMMARY_SCHEMA_VERSION,
    rule_version: input.summary_rule_version ?? SUMMARY_RULE_VERSION,
    intelligence_id: input.intelligence.intelligence_id,
    formation_id: input.formation.formation_id,
    outcome_id: input.outcome.outcome_id,
    validation_id: input.validation.validation_id,
    validation_result: input.intelligence.validation_result,
    evidence_ids: [...evidenceIds].sort(),
  };

  const summary_id = 'intelligence-summary:v1:' +
    crypto.createHash('sha256').update(JSON.stringify(identityPayload)).digest('hex');

  return structuredClone({
    schema_version: SUMMARY_SCHEMA_VERSION,
    summary_id,
    summary_rule_version: identityPayload.rule_version,
    intelligence_id: input.intelligence.intelligence_id,
    formation_id: input.formation.formation_id,
    outcome_id: input.outcome.outcome_id,
    validation_id: input.validation.validation_id,
    validation_result: input.intelligence.validation_result,
    evidence_ids: evidenceIds,
  });
}

module.exports = {
  SUMMARY_SCHEMA_VERSION,
  SUMMARY_RULE_VERSION,
  createIntelligenceEvidenceSummary,
};
