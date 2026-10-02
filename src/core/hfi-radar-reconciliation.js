'use strict';

const crypto = require('node:crypto');

const RECONCILIATION_SCHEMA_VERSION = '1';
const RECONCILIATION_RULE_VERSION = 'hfi-radar-reconciliation-v1';
const REASONS = new Set(['REORG', 'CANONICALITY_CHANGE']);

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

function ids(value, name) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(name.toUpperCase() + '_REQUIRED');
  }
  const seen = new Set();
  for (const id of value) {
    requireString(id, 'evidence_id');
    if (seen.has(id)) throw new TypeError(name.toUpperCase() + '_DUPLICATE');
    seen.add(id);
  }
  return [...value];
}

function createRadarReconciliation(input) {
  requireObject(input, 'input');
  requireObject(input.previous, 'previous');
  requireObject(input.current, 'current');
  requireString(input.reason, 'reason');
  if (!REASONS.has(input.reason)) throw new TypeError('RECONCILIATION_REASON_INVALID');

  requireString(input.previous.radar_id, 'previous_radar_id');
  requireString(input.current.radar_id, 'current_radar_id');

  const previousEvidence = ids(input.previous.evidence_ids, 'previous_evidence_ids');
  const currentEvidence = ids(input.current.evidence_ids, 'current_evidence_ids');

  const sameIdentity = input.previous.radar_id === input.current.radar_id;
  const sameEvidence = JSON.stringify([...previousEvidence].sort()) ===
    JSON.stringify([...currentEvidence].sort());

  let state = 'RECONCILED';
  if (sameIdentity && !sameEvidence) state = 'CONFLICT';
  if (sameIdentity && sameEvidence) state = 'UNCHANGED';

  const identityPayload = {
    schema_version: RECONCILIATION_SCHEMA_VERSION,
    rule_version: RECONCILIATION_RULE_VERSION,
    reason: input.reason,
    previous_radar_id: input.previous.radar_id,
    current_radar_id: input.current.radar_id,
    state,
    previous_evidence_ids: [...previousEvidence].sort(),
    current_evidence_ids: [...currentEvidence].sort(),
  };

  const reconciliationId = 'radar-reconciliation:v1:' +
    crypto.createHash('sha256').update(JSON.stringify(identityPayload)).digest('hex');

  return structuredClone({
    schema_version: RECONCILIATION_SCHEMA_VERSION,
    reconciliation_id: reconciliationId,
    rule_version: RECONCILIATION_RULE_VERSION,
    reason: input.reason,
    state,
    previous_radar_id: input.previous.radar_id,
    current_radar_id: input.current.radar_id,
    previous_evidence_ids: previousEvidence,
    current_evidence_ids: currentEvidence,
    historical_previous_preserved: true,
    authoritative_evidence_mutated: false,
  });
}

module.exports = {
  RECONCILIATION_SCHEMA_VERSION,
  RECONCILIATION_RULE_VERSION,
  REASONS,
  createRadarReconciliation,
};
