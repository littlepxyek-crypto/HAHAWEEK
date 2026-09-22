'use strict';

const { createIntelligenceProjection } = require('./intelligence-projection');

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
}

function createValidatedIntelligence(input) {
  requireObject(input, 'input');
  requireObject(input.formation, 'formation');
  requireObject(input.outcome, 'outcome');
  requireObject(input.validation, 'validation');

  const projection = createIntelligenceProjection({
    formation: input.formation,
    outcome: input.outcome,
    validation: input.validation,
    intelligence_rule_version: input.intelligence_rule_version,
  });

  return structuredClone(projection);
}

module.exports = {
  createValidatedIntelligence,
};
