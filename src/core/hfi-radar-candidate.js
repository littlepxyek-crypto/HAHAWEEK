'use strict';

const crypto = require('node:crypto');

const {
  detectPoolBootstrap,
  compareOrder,
  FORMATION_RULE_VERSION,
} = require('./pool-bootstrap-formation');

const RADAR_SCHEMA_VERSION = '1';
const RADAR_RULE_VERSION = 'hfi-radar-pool-bootstrap-candidate-v1';

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

function requireEventTime(event) {
  requireString(event.event_time, 'event_time');
  const parsed = new Date(event.event_time).getTime();
  if (!Number.isFinite(parsed)) throw new TypeError('INVALID_EVENT_TIME');
}

function createCandidateRadarRecord(input) {
  requireObject(input, 'input');
  if (!Array.isArray(input.events) || input.events.length === 0) {
    throw new TypeError('EVENTS_REQUIRED');
  }

  const detection = detectPoolBootstrap(input.events);
  if (detection.state !== 'CANDIDATE') {
    throw new TypeError('CANDIDATE_RADAR_REQUIRES_CANDIDATE_FORMATION_STATE');
  }

  const created = input.events
    .filter((event) => event.event_type === 'POOL_CREATED')
    .sort(compareOrder)[0];

  const liquidity = input.events
    .filter((event) => event.event_type === 'LIQUIDITY_ADDED')
    .sort(compareOrder)[0];

  requireObject(created, 'created_event');
  requireObject(liquidity, 'liquidity_event');
  requireString(created.pool_id, 'pool_id');
  requireString(created.evidence_id, 'created_evidence_id');
  requireString(liquidity.evidence_id, 'liquidity_evidence_id');
  requireString(String(created.chain_id), 'chain_id');
  requireEventTime(created);
  requireEventTime(liquidity);

  const evidenceIds = [created.evidence_id, liquidity.evidence_id];
  if (new Set(evidenceIds).size !== evidenceIds.length) {
    throw new TypeError('EVIDENCE_IDS_DUPLICATE');
  }

  const radarRuleVersion = input.radar_rule_version ?? RADAR_RULE_VERSION;
  requireString(radarRuleVersion, 'radar_rule_version');

  const identityPayload = {
    schema_version: RADAR_SCHEMA_VERSION,
    radar_rule_version: radarRuleVersion,
    radar_kind: 'CANDIDATE',
    radar_state: 'CANDIDATE',
    source_state: detection.state,
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: FORMATION_RULE_VERSION,
    chain_id: String(created.chain_id),
    pool_id: created.pool_id.toLowerCase(),
    evidence_ids: [...evidenceIds].sort(),
    observation_boundary: liquidity.event_time,
  };

  const radarId = 'radar-candidate:v1:' +
    crypto.createHash('sha256').update(JSON.stringify(identityPayload)).digest('hex');

  return structuredClone({
    schema_version: RADAR_SCHEMA_VERSION,
    radar_id: radarId,
    radar_rule_version: radarRuleVersion,
    radar_kind: 'CANDIDATE',
    radar_state: 'CANDIDATE',
    source_state: detection.state,
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: FORMATION_RULE_VERSION,
    chain_id: created.chain_id,
    pool_id: created.pool_id.toLowerCase(),
    evidence_ids: evidenceIds,
    observation_boundary: liquidity.event_time,
    event_times: {
      pool_created: created.event_time,
      liquidity_added: liquidity.event_time,
    },
    provenance_reference: {
      chain_id: created.chain_id,
      evidence_ids: evidenceIds,
    },
  });
}

module.exports = {
  RADAR_SCHEMA_VERSION,
  RADAR_RULE_VERSION,
  createCandidateRadarRecord,
};
