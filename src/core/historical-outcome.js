'use strict';

const crypto = require('node:crypto');

const OUTCOME_SCHEMA_VERSION = '1';
const OUTCOME_RULE_VERSION = 'historical-outcome-v1';
const COVERAGE_STATUSES = new Set(['COMPLETE', 'PARTIAL', 'UNKNOWN']);

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name.toUpperCase()}_REQUIRED`);
  }
}

function requireNonNegativeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`INVALID_${name.toUpperCase()}`);
  }
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name.toUpperCase()}_REQUIRED`);
  }
}

function canonicalObservation(observation) {
  requireObject(observation, 'observation');
  requireString(observation.evidence_id, 'evidence_id');
  if (typeof observation.event_time !== 'string' || !observation.event_time) {
    throw new Error('EVENT_TIME_REQUIRED');
  }
  return {
    evidence_id: observation.evidence_id,
    event_time: observation.event_time,
    value: observation.value ?? null,
  };
}

function outcomeId(payload) {
  return `outcome:v1:${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}

function createHistoricalOutcome(input) {
  requireObject(input, 'input');
  requireString(input.formation_id, 'formation_id');
  requireString(input.formation_rule_version, 'formation_rule_version');
  requireString(input.formation_end, 'formation_end');
  requireString(input.outcome_rule_version ?? OUTCOME_RULE_VERSION, 'outcome_rule_version');
  requireString(input.observation_start, 'observation_start');
  requireString(input.observation_end, 'observation_end');
  const formationEnd = new Date(input.formation_end).getTime();
  const observationStart = new Date(input.observation_start).getTime();
  const observationEnd = new Date(input.observation_end).getTime();
  if (!Number.isFinite(formationEnd) || !Number.isFinite(observationStart) || !Number.isFinite(observationEnd)) {
    throw new Error('INVALID_OBSERVATION_TIME');
  }
  if (observationStart < formationEnd) {
    throw new Error('OBSERVATION_PRECEDES_FORMATION');
  }
  if (observationEnd < observationStart) {
    throw new Error('INVALID_OBSERVATION_WINDOW');
  }
  if (!Array.isArray(input.observations)) throw new Error('OBSERVATIONS_REQUIRED');
  if (!COVERAGE_STATUSES.has(input.coverage_status)) {
    throw new Error('INVALID_COVERAGE_STATUS');
  }

  const observations = input.observations.map(canonicalObservation);
  for (const observation of observations) {
    const time = new Date(observation.event_time).getTime();
    const start = observationStart;
    const end = observationEnd;
    if (!Number.isFinite(time) || time < start || time > end) {
      throw new Error('OBSERVATION_OUTSIDE_WINDOW');
    }
  }

  const evidenceIds = observations.map((observation) => observation.evidence_id);
  const provenance = input.provenance_reference ?? {
    evidence_ids: evidenceIds,
  };
  requireObject(provenance, 'provenance_reference');

  const identityPayload = {
    schema_version: OUTCOME_SCHEMA_VERSION,
    outcome_rule_version: input.outcome_rule_version ?? OUTCOME_RULE_VERSION,
    formation_id: input.formation_id,
    formation_rule_version: input.formation_rule_version,
    formation_end: input.formation_end,
    observation_start: input.observation_start,
    observation_end: input.observation_end,
    coverage_status: input.coverage_status,
    observations,
    evidence_ids: evidenceIds,
  };

  return {
    outcome_id: outcomeId(identityPayload),
    formation_id: input.formation_id,
    formation_rule_version: input.formation_rule_version,
    outcome_rule_version: input.outcome_rule_version ?? OUTCOME_RULE_VERSION,
    observation_start: input.observation_start,
    observation_end: input.observation_end,
    observations,
    coverage_status: input.coverage_status,
    evidence_ids: evidenceIds,
    provenance_reference: provenance,
  };
}

module.exports = {
  OUTCOME_SCHEMA_VERSION,
  OUTCOME_RULE_VERSION,
  COVERAGE_STATUSES,
  createHistoricalOutcome,
};
