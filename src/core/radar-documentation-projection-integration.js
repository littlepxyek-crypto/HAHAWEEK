'use strict';

const { createRadarDocumentationProjection } = require('./radar-documentation-projection');

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
}

function createRadarDocumentationProjectionIntegration(input) {
  requireObject(input, 'input');
  requireObject(input.radar, 'radar');

  return createRadarDocumentationProjection({
    radar: structuredClone(input.radar),
    document_rule_version: input.document_rule_version,
  });
}

module.exports = {
  createRadarDocumentationProjectionIntegration,
};
