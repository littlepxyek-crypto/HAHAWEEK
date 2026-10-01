'use strict';

const { detectPoolBootstrap } = require('./pool-bootstrap-formation');

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

function toFormationEvidence(event) {
  requireObject(event, 'event');
  requireString(event.eventType, 'event_type');
  requireString(event.identity, 'identity');
  requireString(event.poolId, 'pool_id');

  let eventType;
  if (event.eventType === 'POOL_INITIALIZED') {
    eventType = 'POOL_CREATED';
  } else if (event.eventType === 'LIQUIDITY_MODIFIED') {
    if (typeof event.liquidityDelta !== 'string' || event.liquidityDelta.length === 0) {
      throw new Error('LIQUIDITY_DELTA_REQUIRED');
    }
    if (BigInt(event.liquidityDelta) <= 0n) {
      throw new Error('LIQUIDITY_ADDITION_NOT_POSITIVE');
    }
    eventType = 'LIQUIDITY_ADDED';
  } else if (event.eventType === 'SWAP') {
    eventType = 'SWAP';
  } else {
    throw new Error('UNSUPPORTED_FORMATION_EVENT');
  }

  requireString(event.event_time, 'event_time');

  return {
    event_type: eventType,
    evidence_id: event.identity,
    chain_id: event.chainId,
    pool_id: event.poolId,
    block_number: event.blockNumber,
    transaction_index: event.transactionIndex ?? 0,
    log_index: event.logIndex,
    event_time: event.event_time,
  };
}

function detectPoolBootstrapFromDecodedEvents(events) {
  if (!Array.isArray(events)) throw new Error('EVENTS_REQUIRED');
  return detectPoolBootstrap(events.map(toFormationEvidence));
}

module.exports = {
  toFormationEvidence,
  detectPoolBootstrapFromDecodedEvents,
};
