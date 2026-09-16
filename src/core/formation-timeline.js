'use strict';

function createFormationTimeline(event) {
  if (!event || typeof event !== 'object') {
    throw new Error('FORMATION_EVENT_REQUIRED');
  }

  if (event.eventType !== 'POOL_INITIALIZED') {
    throw new Error('INVALID_FORMATION_EVENT');
  }

  if (!Number.isInteger(event.chainId) || event.chainId <= 0) {
    throw new Error('INVALID_CHAIN_ID');
  }

  if (!Number.isInteger(event.blockNumber) || event.blockNumber < 0) {
    throw new Error('INVALID_BLOCK_NUMBER');
  }

  if (!event.transactionHash) {
    throw new Error('TRANSACTION_HASH_REQUIRED');
  }

  if (!Number.isInteger(event.logIndex) || event.logIndex < 0) {
    throw new Error('INVALID_LOG_INDEX');
  }

  if (!event.poolId) {
    throw new Error('POOL_ID_REQUIRED');
  }

  return {
    version: 1,
    chainId: event.chainId,
    poolId: event.poolId,
    events: [
      {
        sequence: 0,
        stage: 'FORMATION',
        eventType: 'POOL_INITIALIZED',
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
        poolId: event.poolId,
      },
    ],
  };
}

function appendTimelineEvent(timeline, event) {
  if (!timeline || typeof timeline !== 'object') {
    throw new Error('TIMELINE_REQUIRED');
  }

  if (!event || typeof event !== 'object') {
    throw new Error('TIMELINE_EVENT_REQUIRED');
  }

  if (event.chainId !== timeline.chainId) {
    throw new Error('CHAIN_ID_MISMATCH');
  }

  if (event.poolId !== timeline.poolId) {
    throw new Error('POOL_ID_MISMATCH');
  }

  if (!Number.isInteger(event.blockNumber) || event.blockNumber < 0) {
    throw new Error('INVALID_BLOCK_NUMBER');
  }

  const previous = timeline.events[timeline.events.length - 1];

  if (
    previous &&
    event.blockNumber < previous.blockNumber
  ) {
    throw new Error('TIMELINE_ORDER_VIOLATION');
  }

  return {
    ...timeline,
    events: [
      ...timeline.events,
      {
        ...event,
        sequence: timeline.events.length,
      },
    ],
  };
}

module.exports = {
  createFormationTimeline,
  appendTimelineEvent,
};
