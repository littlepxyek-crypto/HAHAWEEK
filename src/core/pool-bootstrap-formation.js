'use strict';

const crypto = require('node:crypto');

const FORMATION_TYPE = 'POOL_BOOTSTRAP';
const FORMATION_RULE_VERSION = 'pool-bootstrap-v1';
const REQUIRED_EVENTS = ['POOL_CREATED', 'LIQUIDITY_ADDED', 'FIRST_SWAP'];
const STATES = new Set(['OBSERVED', 'PARTIAL', 'CANDIDATE', 'VALID']);

function requireEvent(event, name = 'event') {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new Error(`${name.toUpperCase()}_REQUIRED`);
  }
  if (typeof event.event_type !== 'string' || !event.event_type) {
    throw new Error('EVENT_TYPE_REQUIRED');
  }
  if (typeof event.evidence_id !== 'string' || !event.evidence_id) {
    throw new Error('EVIDENCE_ID_REQUIRED');
  }
  if (!Number.isSafeInteger(event.chain_id) || event.chain_id <= 0) {
    throw new Error('INVALID_CHAIN_ID');
  }
  if (typeof event.pool_id !== 'string' || !event.pool_id) {
    throw new Error('POOL_ID_REQUIRED');
  }
  if (!Number.isSafeInteger(event.block_number) || event.block_number < 0) {
    throw new Error('INVALID_BLOCK_NUMBER');
  }
  if (!Number.isSafeInteger(event.transaction_index) || event.transaction_index < 0) {
    throw new Error('INVALID_TRANSACTION_INDEX');
  }
  if (!Number.isSafeInteger(event.log_index) || event.log_index < 0) {
    throw new Error('INVALID_LOG_INDEX');
  }
}

function eventOrder(event) {
  return [event.block_number, event.transaction_index, event.log_index];
}

function compareOrder(a, b) {
  const ao = eventOrder(a);
  const bo = eventOrder(b);
  for (let i = 0; i < ao.length; i += 1) {
    if (ao[i] !== bo[i]) return ao[i] - bo[i];
  }
  return 0;
}

function formationId(chainId, poolId, evidenceIds) {
  const payload = JSON.stringify({
    formation_rule_version: FORMATION_RULE_VERSION,
    formation_type: FORMATION_TYPE,
    chain_id: String(chainId),
    pool_id: poolId.toLowerCase(),
    evidence_ids: evidenceIds,
  });
  return `formation:v1:${crypto.createHash('sha256').update(payload).digest('hex')}`;
}

function detectPoolBootstrap(events) {
  if (!Array.isArray(events)) throw new Error('EVENTS_REQUIRED');
  for (const event of events) requireEvent(event);

  if (events.length === 0) {
    return { formation: null, state: 'OBSERVED', reason: 'NO_EVENTS' };
  }

  const poolKeys = new Set(events.map((event) => `${event.chain_id}:${event.pool_id.toLowerCase()}`));
  if (poolKeys.size !== 1) throw new Error('MULTIPLE_POOL_CONTEXTS');

  const ordered = [...events].sort(compareOrder);
  const created = ordered.find((event) => event.event_type === 'POOL_CREATED');
  const liquidity = ordered.find((event) =>
    event.event_type === 'LIQUIDITY_ADDED' && (!created || compareOrder(created, event) <= 0)
  );
  const firstSwap = ordered.find((event) =>
    event.event_type === 'SWAP' &&
    (!liquidity || compareOrder(liquidity, event) <= 0)
  );

  const missing = [];
  if (!created) missing.push('POOL_CREATED');
  if (!liquidity) missing.push('LIQUIDITY_ADDED');
  if (!firstSwap) missing.push('FIRST_SWAP');

  let state = 'OBSERVED';
  if (created || liquidity || firstSwap) state = 'PARTIAL';
  if (created && liquidity) state = 'CANDIDATE';
  if (created && liquidity && firstSwap) state = 'VALID';

  if (state !== 'VALID') {
    return {
      formation: null,
      state,
      missing,
      ordered_evidence_ids: ordered.map((event) => event.evidence_id),
    };
  }

  const selected = [created, liquidity, firstSwap];
  const evidenceIds = selected.map((event) => event.evidence_id);
  const formation = {
    formation_id: formationId(created.chain_id, created.pool_id, evidenceIds),
    formation_type: FORMATION_TYPE,
    formation_rule_version: FORMATION_RULE_VERSION,
    chain_id: created.chain_id,
    pool_id: created.pool_id.toLowerCase(),
    formation_start: created.event_time ?? null,
    formation_end: firstSwap.event_time ?? null,
    state,
    evidence_ids: evidenceIds,
    event_order: selected.map((event) => ({
      event_type: event.event_type,
      evidence_id: event.evidence_id,
      block_number: event.block_number,
      transaction_index: event.transaction_index,
      log_index: event.log_index,
    })),
  };

  return { formation, state, missing: [] };
}

module.exports = {
  FORMATION_TYPE,
  FORMATION_RULE_VERSION,
  REQUIRED_EVENTS,
  STATES,
  compareOrder,
  detectPoolBootstrap,
};
