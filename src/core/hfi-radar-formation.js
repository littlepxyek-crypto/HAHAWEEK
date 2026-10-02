'use strict';

const crypto = require('node:crypto');

const RADAR_SCHEMA_VERSION = '1';
const RADAR_RULE_VERSION = 'hfi-radar-formation-v1';

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

function requireIds(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('EVIDENCE_IDS_REQUIRED');
  }
  const seen = new Set();
  for (const id of value) {
    requireString(id, 'evidence_id');
    if (seen.has(id)) throw new TypeError('EVIDENCE_IDS_DUPLICATE');
    seen.add(id);
  }
  return [...value];
}

function createFormationRadarRecord(input) {
  requireObject(input, 'input');
  requireObject(input.formation, 'formation');

  const formation = input.formation;
  requireString(formation.formation_id, 'formation_id');
  requireString(formation.formation_type, 'formation_type');
  requireString(formation.formation_rule_version, 'formation_rule_version');
  requireString(formation.chain_id == null ? '' : String(formation.chain_id), 'chain_id');
  requireString(formation.pool_id, 'pool_id');
  requireString(formation.state, 'state');

  if (formation.state !== 'VALID') {
    throw new TypeError('FORMATION_RADAR_REQUIRES_VALID_FORMATION');
  }

  const evidenceIds = requireIds(formation.evidence_ids);
  const radarRuleVersion = input.radar_rule_version ?? RADAR_RULE_VERSION;
  requireString(radarRuleVersion, 'radar_rule_version');

  const identityPayload = {
    schema_version: RADAR_SCHEMA_VERSION,
    radar_rule_version: radarRuleVersion,
    radar_kind: 'FORMATION',
    radar_state: 'OBSERVED',
    source_state: formation.state,
    formation_id: formation.formation_id,
    formation_type: formation.formation_type,
    formation_rule_version: formation.formation_rule_version,
    chain_id: String(formation.chain_id),
    pool_id: formation.pool_id.toLowerCase(),
    formation_start: formation.formation_start ?? null,
    formation_end: formation.formation_end ?? null,
    evidence_ids: [...evidenceIds].sort(),
  };

  const radarId = 'radar-formation:v1:' +
    crypto.createHash('sha256').update(JSON.stringify(identityPayload)).digest('hex');

  return structuredClone({
    schema_version: RADAR_SCHEMA_VERSION,
    radar_id: radarId,
    radar_rule_version: radarRuleVersion,
    radar_kind: 'FORMATION',
    radar_state: 'OBSERVED',
    source_state: formation.state,
    formation_id: formation.formation_id,
    formation_type: formation.formation_type,
    formation_rule_version: formation.formation_rule_version,
    chain_id: formation.chain_id,
    pool_id: formation.pool_id.toLowerCase(),
    formation_start: formation.formation_start ?? null,
    formation_end: formation.formation_end ?? null,
    evidence_ids: evidenceIds,
    provenance_reference: formation.provenance_reference ?? {
      chain_id: formation.chain_id,
      evidence_ids: evidenceIds,
    },
  });
}

module.exports = {
  RADAR_SCHEMA_VERSION,
  RADAR_RULE_VERSION,
  createFormationRadarRecord,
};
