'use strict';

const { createValidatedRadarRecord } = require('./validated-radar-record');

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
}

function createValidatedRadar(input) {
  requireObject(input, 'input');
  requireObject(input.summary, 'summary');

  const record = createValidatedRadarRecord({
    summary: structuredClone(input.summary),
    radar_rule_version: input.radar_rule_version,
  });

  return structuredClone(record);
}

module.exports = {
  createValidatedRadar,
};
