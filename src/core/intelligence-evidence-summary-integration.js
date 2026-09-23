'use strict';

const { createIntelligenceEvidenceSummary } = require('./intelligence-evidence-summary');

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
}

function createValidatedEvidenceSummary(input) {
  requireObject(input, 'input');
  requireObject(input.intelligence, 'intelligence');
  requireObject(input.formation, 'formation');
  requireObject(input.outcome, 'outcome');
  requireObject(input.validation, 'validation');

  return createIntelligenceEvidenceSummary({
    intelligence: structuredClone(input.intelligence),
    formation: structuredClone(input.formation),
    outcome: structuredClone(input.outcome),
    validation: structuredClone(input.validation),
    summary_rule_version: input.summary_rule_version,
  });
}

module.exports = {
  createValidatedEvidenceSummary,
};
