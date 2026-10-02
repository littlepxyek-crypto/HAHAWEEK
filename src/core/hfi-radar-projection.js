'use strict';

const crypto = require('node:crypto');

const { createFormationRadarRecord } = require('./hfi-radar-formation');
const { createCandidateRadarRecord } = require('./hfi-radar-candidate');

const PROJECTION_SCHEMA_VERSION = '1';
const PROJECTION_RULE_VERSION = 'hfi-radar-projection-v1';

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

function createValidatedProjection(validatedRadar) {
  requireObject(validatedRadar, 'validated_radar');
  requireString(validatedRadar.radar_id, 'validated_radar_id');
  if (validatedRadar.state !== 'VERIFIED') {
    throw new TypeError('VALIDATED_RADAR_REQUIRES_VERIFIED_RECORD');
  }

  const identityPayload = {
    schema_version: PROJECTION_SCHEMA_VERSION,
    projection_rule_version: PROJECTION_RULE_VERSION,
    radar_kind: 'VALIDATED',
    radar_state: 'VALIDATED',
    validated_radar_id: validatedRadar.radar_id,
  };

  const projectionId = 'hfi-radar:v1:' +
    crypto.createHash('sha256').update(JSON.stringify(identityPayload)).digest('hex');

  return structuredClone({
    schema_version: PROJECTION_SCHEMA_VERSION,
    projection_id: projectionId,
    projection_rule_version: PROJECTION_RULE_VERSION,
    radar_kind: 'VALIDATED',
    radar_state: 'VALIDATED',
    validated_radar_id: validatedRadar.radar_id,
    lineage: {
      summary_id: validatedRadar.summary_id ?? null,
      intelligence_id: validatedRadar.intelligence_id ?? null,
      formation_id: validatedRadar.formation_id ?? null,
      outcome_id: validatedRadar.outcome_id ?? null,
      validation_id: validatedRadar.validation_id ?? null,
    },
    evidence_ids: Array.isArray(validatedRadar.evidence_ids)
      ? [...validatedRadar.evidence_ids]
      : [],
  });
}

function createHfiRadarProjection(input) {
  requireObject(input, 'input');

  if (input.kind === 'FORMATION') {
    return createFormationRadarRecord({
      formation: input.formation,
      radar_rule_version: input.radar_rule_version,
    });
  }

  if (input.kind === 'CANDIDATE') {
    return createCandidateRadarRecord({
      events: input.events,
      radar_rule_version: input.radar_rule_version,
    });
  }

  if (input.kind === 'VALIDATED') {
    return createValidatedProjection(input.validated_radar);
  }

  throw new TypeError('RADAR_KIND_INVALID');
}

module.exports = {
  PROJECTION_SCHEMA_VERSION,
  PROJECTION_RULE_VERSION,
  createValidatedProjection,
  createHfiRadarProjection,
};
