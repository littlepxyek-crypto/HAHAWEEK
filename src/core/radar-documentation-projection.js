'use strict';

const crypto = require('node:crypto');

const DOCUMENT_SCHEMA_VERSION = '1';
const DOCUMENT_RULE_VERSION = 'radar-documentation-projection-v1';

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
function requireEvidenceIds(value) {
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

function createRadarDocumentationProjection(input) {
  requireObject(input, 'input');
  requireObject(input.radar, 'radar');

  const radar = input.radar;
  requireString(radar.radar_id, 'radar_id');
  requireString(radar.summary_id, 'summary_id');
  requireString(radar.intelligence_id, 'intelligence_id');
  requireString(radar.formation_id, 'formation_id');
  requireString(radar.outcome_id, 'outcome_id');
  requireString(radar.validation_id, 'validation_id');
  requireString(radar.validation_result, 'validation_result');
  requireString(radar.radar_type, 'radar_type');
  requireString(radar.state, 'state');

  if (radar.state !== 'VERIFIED') throw new TypeError('DOCUMENT_REQUIRES_VERIFIED_RADAR');
  const evidenceIds = requireEvidenceIds(radar.evidence_ids);

  const identityPayload = {
    schema_version: DOCUMENT_SCHEMA_VERSION,
    rule_version: input.document_rule_version ?? DOCUMENT_RULE_VERSION,
    radar_id: radar.radar_id,
    summary_id: radar.summary_id,
    intelligence_id: radar.intelligence_id,
    formation_id: radar.formation_id,
    outcome_id: radar.outcome_id,
    validation_id: radar.validation_id,
    validation_result: radar.validation_result,
    radar_type: radar.radar_type,
    state: radar.state,
    evidence_ids: [...evidenceIds].sort(),
  };

  const document_id = 'radar-document:v1:' +
    crypto.createHash('sha256').update(JSON.stringify(identityPayload)).digest('hex');

  return structuredClone({
    schema_version: DOCUMENT_SCHEMA_VERSION,
    document_id,
    document_rule_version: identityPayload.rule_version,
    document_type: 'VERIFIED_RADAR_RECORD',
    radar_id: radar.radar_id,
    radar_type: radar.radar_type,
    state: radar.state,
    validation_result: radar.validation_result,
    lineage: {
      summary_id: radar.summary_id,
      intelligence_id: radar.intelligence_id,
      formation_id: radar.formation_id,
      outcome_id: radar.outcome_id,
      validation_id: radar.validation_id,
    },
    evidence_ids: evidenceIds,
    interpretation_boundary:
      'This document records a verified historical radar state and does not constitute a prediction or future-performance guarantee.',
  });
}

module.exports = {
  DOCUMENT_SCHEMA_VERSION,
  DOCUMENT_RULE_VERSION,
  createRadarDocumentationProjection,
};
