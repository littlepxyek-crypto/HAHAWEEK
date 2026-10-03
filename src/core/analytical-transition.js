'use strict';

const crypto = require('node:crypto');

const ANALYTICAL_TRANSITION_SCHEMA_VERSION = '1';

const DOMAINS = Object.freeze({
  FORMATION: 'HAHAWEEK-EVIDENCE-V4-FORMATION-TRANSITION',
  HYPOTHESIS: 'HAHAWEEK-EVIDENCE-V4-HYPOTHESIS-TRANSITION',
  VALIDATION: 'HAHAWEEK-EVIDENCE-V4-VALIDATION-TRANSITION',
});

const DOMAIN_STATES = Object.freeze({
  FORMATION: Object.freeze(['OBSERVED', 'PARTIAL', 'CANDIDATE', 'VALID', 'UNKNOWN', 'INCONCLUSIVE']),
  HYPOTHESIS: Object.freeze(['PROPOSED', 'SUPPORTED', 'REFUTED', 'UNKNOWN', 'INCONCLUSIVE']),
  VALIDATION: Object.freeze(['PENDING', 'EVALUATING', 'CONFIRMED', 'REJECTED', 'UNKNOWN', 'INCONCLUSIVE']),
});

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

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] !== undefined) out[key] = canonicalize(value[key]);
  }
  return out;
}

function transitionIdentity(domain, payload) {
  return `analytical-transition:v1:${crypto.createHash('sha256')
    .update(Buffer.from(domain, 'utf8'))
    .update(Buffer.from([0]))
    .update(Buffer.from(JSON.stringify(canonicalize(payload)), 'utf8'))
    .digest('hex')}`;
}

function createAnalyticalTransition(domain, input) {
  if (!Object.values(DOMAINS).includes(domain)) throw new Error('ANALYTICAL_DOMAIN_INVALID');
  requireObject(input, 'input');

  requireString(input.entity_id, 'entity_id');
  requireString(input.previous_state, 'previous_state');
  requireString(input.next_state, 'next_state');
  requireString(input.reason, 'reason');
  requireString(input.rule_version, 'rule_version');
  requireString(input.processing_context_id, 'processing_context_id');

  const domainName = Object.keys(DOMAINS).find(key => DOMAINS[key] === domain);
  const states = DOMAIN_STATES[domainName];
  if (!states.includes(input.previous_state) || !states.includes(input.next_state)) {
    throw new Error('ANALYTICAL_STATE_INVALID');
  }
  if (input.previous_state === input.next_state) throw new Error('ANALYTICAL_NOOP_TRANSITION');

  if (!Array.isArray(input.evidence_ids)) throw new Error('EVIDENCE_IDS_REQUIRED');
  for (const evidenceId of input.evidence_ids) requireString(evidenceId, 'evidence_id');

  requireObject(input.temporal_context, 'temporal_context');
  requireObject(input.provenance, 'provenance');

  const payload = {
    schema_version: ANALYTICAL_TRANSITION_SCHEMA_VERSION,
    domain,
    entity_id: input.entity_id,
    previous_state: input.previous_state,
    next_state: input.next_state,
    reason: input.reason,
    evidence_ids: [...input.evidence_ids],
    temporal_context: input.temporal_context,
    rule_version: input.rule_version,
    processing_context_id: input.processing_context_id,
    provenance: input.provenance,
    sequence: input.sequence ?? null,
    previous_transition_id: input.previous_transition_id ?? null,
  };

  return Object.freeze({
    transition_id: transitionIdentity(domain, payload),
    ...payload,
  });
}

module.exports = {
  ANALYTICAL_TRANSITION_SCHEMA_VERSION,
  DOMAINS,
  DOMAIN_STATES,
  canonicalize,
  createAnalyticalTransition,
};
