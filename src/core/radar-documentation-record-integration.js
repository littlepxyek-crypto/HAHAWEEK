'use strict';

const { createRadarDocumentationRecord } = require('./radar-documentation-record');

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
}

function createRadarDocumentationRecordIntegration(input) {
  requireObject(input, 'input');
  requireObject(input.document, 'document');

  return createRadarDocumentationRecord({
    document: structuredClone(input.document),
    rule_version: input.rule_version,
  });
}

module.exports = {
  createRadarDocumentationRecordIntegration,
};
