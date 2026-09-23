'use strict';

const crypto = require('node:crypto');

const RADAR_SCHEMA_VERSION = '1';
const RADAR_RULE_VERSION = 'validated-radar-record-v1';
const RADAR_TYPE = 'EARLY_FORMATION';
const RADAR_STATE = 'VERIFIED';

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(name.toUpperCase() + '_REQUIRED');
}
function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(name.toUpperCase() + '_REQUIRED');
}
function requireIds(value, name) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError(name.toUpperCase() + '_REQUIRED');
  const seen = new Set();
  for (const id of value) {
    requireString(id, name);
    if (seen.has(id)) throw new TypeError(name.toUpperCase() + '_DUPLICATE');
    seen.add(id);
  }
  return [...value];
}
function createValidatedRadarRecord(input) {
  requireObject(input, 'input');
  requireObject(input.summary, 'summary');
  requireString(input.summary.summary_id, 'summary_id');
  requireString(input.summary.intelligence_id, 'intelligence_id');
  requireString(input.summary.formation_id, 'formation_id');
  requireString(input.summary.outcome_id, 'outcome_id');
  requireString(input.summary.validation_id, 'validation_id');
  if (input.summary.validation_result !== 'CONFIRMED') throw new TypeError('RADAR_REQUIRES_CONFIRMED_VALIDATION');
  const evidenceIds = requireIds(input.summary.evidence_ids, 'evidence_ids');
  const identityPayload = {
    schema_version: RADAR_SCHEMA_VERSION,
    rule_version: input.radar_rule_version ?? RADAR_RULE_VERSION,
    radar_type: RADAR_TYPE,
    state: RADAR_STATE,
    summary_id: input.summary.summary_id,
    intelligence_id: input.summary.intelligence_id,
    formation_id: input.summary.formation_id,
    outcome_id: input.summary.outcome_id,
    validation_id: input.summary.validation_id,
    validation_result: input.summary.validation_result,
    evidence_ids: [...evidenceIds].sort(),
  };
  const radar_id = 'radar:v1:' + crypto.createHash('sha256').update(JSON.stringify(identityPayload)).digest('hex');
  return structuredClone({
    schema_version: RADAR_SCHEMA_VERSION,
    radar_id,
    radar_rule_version: identityPayload.rule_version,
    radar_type: RADAR_TYPE,
    state: RADAR_STATE,
    summary_id: input.summary.summary_id,
    intelligence_id: input.summary.intelligence_id,
    formation_id: input.summary.formation_id,
    outcome_id: input.summary.outcome_id,
    validation_id: input.summary.validation_id,
    validation_result: input.summary.validation_result,
    evidence_ids: evidenceIds,
  });
}
module.exports = { RADAR_SCHEMA_VERSION, RADAR_RULE_VERSION, RADAR_TYPE, RADAR_STATE, createValidatedRadarRecord };
