'use strict';

const crypto = require('node:crypto');

const DESCRIPTIVE_MEASUREMENT_SCHEMA_VERSION = '1';
const DESCRIPTIVE_MEASUREMENT_RULE_VERSION = 'descriptive-measurement-v1';

const RESERVED_DECISION_FIELDS = new Set([
  'score',
  'rank',
  'ranking',
  'prediction',
  'signal',
  'recommendation',
  'action',
  'buy_sell',
  'trading_decision',
]);

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

function canonicalize(input) {
  requireObject(input, 'input');
  requireString(input.measurement_id, 'measurement_id');
  requireString(input.measurement_rule_version ?? DESCRIPTIVE_MEASUREMENT_RULE_VERSION, 'measurement_rule_version');
  requireString(input.metric_name, 'metric_name');
  requireString(input.unit, 'unit');
  requireString(input.measurement_time, 'measurement_time');

  if (!Number.isFinite(input.value)) {
    throw new Error('MEASUREMENT_VALUE_MUST_BE_FINITE');
  }

  if (!Number.isFinite(Date.parse(input.measurement_time))) {
    throw new Error('INVALID_MEASUREMENT_TIME');
  }

  if (!Array.isArray(input.evidence_ids) || input.evidence_ids.length === 0) {
    throw new Error('MEASUREMENT_EVIDENCE_IDS_REQUIRED');
  }
  for (const evidenceId of input.evidence_ids) requireString(evidenceId, 'evidence_id');

  for (const key of Object.keys(input)) {
    if (RESERVED_DECISION_FIELDS.has(key)) {
      throw new Error(`DESCRIPTIVE_DECISION_FIELD_FORBIDDEN:${key}`);
    }
  }

  return {
    schema_version: DESCRIPTIVE_MEASUREMENT_SCHEMA_VERSION,
    measurement_id: input.measurement_id,
    measurement_rule_version: input.measurement_rule_version ?? DESCRIPTIVE_MEASUREMENT_RULE_VERSION,
    metric_name: input.metric_name,
    value: input.value,
    unit: input.unit,
    evidence_ids: [...new Set(input.evidence_ids)],
    measurement_time: input.measurement_time,
    source_kind: input.source_kind ?? null,
    observation_window: input.observation_window ?? null,
    provenance_reference: input.provenance_reference ?? null,
  };
}

function createDescriptiveMeasurement(input) {
  const canonical = canonicalize(input);
  return {
    ...canonical,
    measurement_identity: `measurement:v1:${crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex')}`,
  };
}

module.exports = {
  DESCRIPTIVE_MEASUREMENT_SCHEMA_VERSION,
  DESCRIPTIVE_MEASUREMENT_RULE_VERSION,
  RESERVED_DECISION_FIELDS,
  createDescriptiveMeasurement,
};
