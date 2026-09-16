'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createFormationTimeline,
  appendTimelineEvent,
} = require('../src/core/formation-timeline');

const formationEvent = {
  eventType: 'POOL_INITIALIZED',
  chainId: 4663,
  poolId: '0xpool001',
  blockNumber: 100,
  transactionHash: '0xtx001',
  logIndex: 7,
};

test('formation timeline starts at T0', () => {
  const timeline = createFormationTimeline(formationEvent);

  assert.equal(timeline.version, 1);
  assert.equal(timeline.chainId, 4663);
  assert.equal(timeline.poolId, '0xpool001');
  assert.equal(timeline.events.length, 1);

  assert.deepEqual(timeline.events[0], {
    sequence: 0,
    stage: 'FORMATION',
    eventType: 'POOL_INITIALIZED',
    chainId: 4663,
    blockNumber: 100,
    transactionHash: '0xtx001',
    logIndex: 7,
    poolId: '0xpool001',
  });
});

test('timeline appends events in blockchain order', () => {
  const timeline = createFormationTimeline(formationEvent);

  const next = appendTimelineEvent(timeline, {
    chainId: 4663,
    poolId: '0xpool001',
    stage: 'LIQUIDITY',
    eventType: 'LIQUIDITY_DETECTED',
    blockNumber: 101,
    transactionHash: '0xtx002',
    logIndex: 3,
  });

  assert.equal(next.events.length, 2);
  assert.equal(next.events[1].sequence, 1);
  assert.equal(next.events[1].eventType, 'LIQUIDITY_DETECTED');
});

test('timeline rejects backwards block order', () => {
  const timeline = createFormationTimeline(formationEvent);

  assert.throws(
    () =>
      appendTimelineEvent(timeline, {
        chainId: 4663,
        poolId: '0xpool001',
        eventType: 'EARLIER_EVENT',
        blockNumber: 99,
        transactionHash: '0xtx000',
        logIndex: 1,
      }),
    /TIMELINE_ORDER_VIOLATION/
  );
});

test('timeline rejects different pool identity', () => {
  const timeline = createFormationTimeline(formationEvent);

  assert.throws(
    () =>
      appendTimelineEvent(timeline, {
        chainId: 4663,
        poolId: '0xdifferent',
        eventType: 'OTHER_POOL',
        blockNumber: 101,
        transactionHash: '0xtx002',
        logIndex: 1,
      }),
    /POOL_ID_MISMATCH/
  );
});

test('timeline rejects different chain', () => {
  const timeline = createFormationTimeline(formationEvent);

  assert.throws(
    () =>
      appendTimelineEvent(timeline, {
        chainId: 1,
        poolId: '0xpool001',
        eventType: 'OTHER_CHAIN',
        blockNumber: 101,
        transactionHash: '0xtx002',
        logIndex: 1,
      }),
    /CHAIN_ID_MISMATCH/
  );
});

test('timeline append is immutable', () => {
  const timeline = createFormationTimeline(formationEvent);

  const next = appendTimelineEvent(timeline, {
    chainId: 4663,
    poolId: '0xpool001',
    eventType: 'LIQUIDITY_DETECTED',
    blockNumber: 101,
    transactionHash: '0xtx002',
    logIndex: 1,
  });

  assert.equal(timeline.events.length, 1);
  assert.equal(next.events.length, 2);
});
