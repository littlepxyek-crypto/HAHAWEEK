'use strict';

const FORMATION_COMPLETENESS_CONTRACT_VERSION = 'FORMATION_COMPLETENESS_V1';
const REQUIRED_EVENTS = Object.freeze(['POOL_CREATED', 'LIQUIDITY_ADDED', 'FIRST_SWAP']);
const STATES = Object.freeze(['OBSERVED', 'PARTIAL', 'CANDIDATE', 'VALID', 'UNKNOWN', 'INCONCLUSIVE']);

const INCOMPLETE_ACQUISITION = new Set(['FAILED', 'UNKNOWN', 'EXPIRED', 'PARTIAL']);

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name.toUpperCase()}_REQUIRED`);
  }
}

function assertEvents(events) {
  if (!Array.isArray(events)) throw new Error('EVENTS_REQUIRED');
  for (const event of events) {
    requireObject(event, 'event');
    if (typeof event.event_type !== 'string' || !event.event_type) {
      throw new Error('EVENT_TYPE_REQUIRED');
    }
    if (typeof event.evidence_id !== 'string' || !event.evidence_id) {
      throw new Error('EVIDENCE_ID_REQUIRED');
    }
  }
}

function classifyFormationCompleteness({ events, acquisition_status = 'COMPLETE', contradictory = false } = {}) {
  assertEvents(events);

  if (!['COMPLETE', 'PARTIAL', 'FAILED', 'UNKNOWN', 'EXPIRED'].includes(acquisition_status)) {
    throw new Error('ACQUISITION_STATUS_INVALID');
  }
  if (contradictory) return Object.freeze({ state: 'INCONCLUSIVE', reason: 'CONTRADICTORY_EVIDENCE' });

  if (INCOMPLETE_ACQUISITION.has(acquisition_status)) {
    return Object.freeze({ state: 'UNKNOWN', reason: 'ACQUISITION_INCOMPLETE' });
  }

  const types = new Set(events.map((event) => event.event_type));
  if (types.size === 0) return Object.freeze({ state: 'OBSERVED', reason: 'NO_FORMATION_EVENTS' });

  const created = events.find((event) => event.event_type === 'POOL_CREATED');
  const liquidity = events.find((event) => event.event_type === 'LIQUIDITY_ADDED');
  const swap = events.find((event) => event.event_type === 'FIRST_SWAP' || event.event_type === 'SWAP');

  if (!created || !liquidity || !swap) {
    if (created && liquidity) return Object.freeze({ state: 'CANDIDATE', reason: 'FIRST_SWAP_MISSING' });
    return Object.freeze({ state: 'PARTIAL', reason: 'REQUIRED_EVIDENCE_MISSING' });
  }

  return Object.freeze({ state: 'VALID', reason: 'REQUIRED_SEQUENCE_PRESENT' });
}

module.exports = {
  FORMATION_COMPLETENESS_CONTRACT_VERSION,
  REQUIRED_EVENTS,
  STATES,
  classifyFormationCompleteness,
};
