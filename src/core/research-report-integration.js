'use strict';

const { createResearchReport } = require('./research-report');

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
}

function createResearchReportIntegration(input) {
  requireObject(input, 'input');
  requireObject(input.formation, 'formation');
  requireObject(input.outcome, 'outcome');
  requireObject(input.validation, 'validation');

  return createResearchReport(structuredClone(input));
}

module.exports = {
  createResearchReportIntegration,
};
