'use strict';

const crypto = require('node:crypto');

const INTELLIGENCE_SCHEMA_VERSION = '1';
const INTELLIGENCE_RULE_VERSION = 'intelligence-projection-v1';
const VALID_RESULTS = new Set(['CONFIRMED', 'REJECTED', 'INCONCLUSIVE']);

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

function uniqueStrings(values, name) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
  const seen = new Set();
  for (const value of values) {
    requireString(value, name);
    if (seen.has(value)) throw new TypeError(name.toUpperCase() + '_DUPLICATE');
    seen.add(value);
  }
  return [...values];
}

function createIntelligenceProjection(input) {
  requireObject(input, 'input');
  requireObject(input.formation, 'formation');
  requireObject(input.outcome, 'outcome');
  requireObject(input.validation, 'validation');

  requireString(input.formation.formation_id, 'formation_id');
  requireString(input.formation.formation_type, 'formation_type');
  requireString(input.outcome.outcome_id, 'outcome_id');
  requireString(input.outcome.formation_id, 'outcome_formation_id');
  requireString(input.validation.validation_id, 'validation_id');
  requireString(input.validation.formation_id, 'validation_formation_id');
  requireString(input.validation.outcome_id, 'validation_outcome_id');

  if (input.outcome.formation_id !== input.formation.formation_id) {
    throw new TypeError('OUTCOME_FORMATION_ID_MISMATCH');
  }
  if (input.validation.formation_id !== input.formation.formation_id) {
    throw new TypeError('VALIDATION_FORMATION_ID_MISMATCH');
  }
  if (input.validation.outcome_id !== input.outcome.outcome_id) {
    throw new TypeError('VALIDATION_OUTCOME_ID_MISMATCH');
  }
  if (!VALID_RESULTS.has(input.validation.result)) {
    throw new TypeError('INVALID_VALIDATION_RESULT');
  }

  const evidenceIds = uniqueStrings([
    ...(Array.isArray(input.formation.evidence_ids) ? input.formation.evidence_ids : []),
    ...(Array.isArray(input.outcome.evidence_ids) ? input.outcome.evidence_ids : []),
    ...(Array.isArray(input.validation.evidence_ids) ? input.validation.evidence_ids : []),
  ], 'evidence_ids');

  const ruleVersion = input.intelligence_rule_version ?? INTELLIGENCE_RULE_VERSION;
  requireString(ruleVersion, 'intelligence_rule_version');

  const identityPayload = {
    schema_version: INTELLIGENCE_SCHEMA_VERSION,
    intelligence_rule_version: ruleVersion,
    formation_id: input.formation.formation_id,
    formation_type: input.formation.formation_type,
    outcome_id: input.outcome.outcome_id,
    validation_id: input.validation.validation_id,
    validation_result: input.validation.result,
    evidence_ids: [...evidenceIds].sort(),
  };

  const intelligence_id = 'intelligence:v1:' +
    crypto.createHash('sha256').update(JSON.stringify(identityPayload)).digest('hex');

  return structuredClone({
    schema_version: INTELLIGENCE_SCHEMA_VERSION,
    intelligence_id,
    intelligence_rule_version: ruleVersion,
    formation_id: input.formation.formation_id,
    formation_type: input.formation.formation_type,
    outcome_id: input.outcome.outcome_id,
    validation_id: input.validation.validation_id,
    validation_result: input.validation.result,
    evidence_ids: evidenceIds,
  });
}

module.exports = {
  INTELLIGENCE_SCHEMA_VERSION,
  INTELLIGENCE_RULE_VERSION,
  VALID_RESULTS,
  createIntelligenceProjection,
};
