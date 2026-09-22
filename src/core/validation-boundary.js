'use strict';

const { createValidationResult } = require('./validation-result');

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

function createValidationBoundary(input) {
  requireObject(input, 'input');
  requireObject(input.formation, 'formation');
  requireObject(input.outcome, 'outcome');

  requireString(input.formation.formation_id, 'formation_id');
  requireString(input.formation.formation_rule_version, 'formation_rule_version');
  requireString(input.outcome.outcome_id, 'outcome_id');
  requireString(input.outcome.outcome_rule_version, 'outcome_rule_version');

  if (input.formation.state !== undefined && input.formation.state !== 'VALID') {
    throw new Error('FORMATION_NOT_VALID');
  }

  if (input.outcome.formation_id !== input.formation.formation_id) {
    throw new Error('OUTCOME_FORMATION_ID_MISMATCH');
  }

  if (input.outcome.formation_rule_version !== input.formation.formation_rule_version) {
    throw new Error('OUTCOME_FORMATION_RULE_VERSION_MISMATCH');
  }

  return createValidationResult({
    ...input,
    formation_id: input.formation.formation_id,
    formation_rule_version: input.formation.formation_rule_version,
    outcome_id: input.outcome.outcome_id,
    outcome_rule_version: input.outcome.outcome_rule_version,
  });
}

module.exports = { createValidationBoundary };
