'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createFormationTimeline,
  appendTimelineEvent,
} = require('../src/core/formation-timeline');

const pool = {
  chainId: 4663,
  poolId:
    '0xd2b08e94155e026e5ab92ac1bef3bc2bcb6b2d67cfdcf445d487b82a8263f960',
  identity: {
    canonicalId:
      '4663:0xd2b08e94155e026e5ab92ac1bef3bc2bcb6b2d67cfdcf445d487b82a8263f960',
  },
};

const formationEvent = {
  eventId:
    '4663:64533057:0x1111111111111111111111111111111111111111111111111111111111111111:0',

  eventType: 'POOL_INITIALIZED',
  stage: 'FORMATION',

  chainId: 4663,
  poolId: pool.poolId,

  blockNumber: 64533057,
  transactionHash:
    '0x1111111111111111111111111111111111111111111111111111111111111111',
  logIndex: 0,

  identity: pool.identity,
};

const liquidityEvent = {
  eventType: 'LIQUIDITY_MODIFIED',
  stage: 'FORMATION',

  chainId: 4663,
  poolId: pool.poolId,

  sender:
    '0xc82c52248b8c88fb24112d611da8cbd460c54a15',

  tickLower: 207180,
  tickUpper: 230220,
  liquidityDelta: '1000000000000000000000',

  blockNumber: 64533057,
  transactionHash:
    '0x0bd29592897611def79454353228d1b8d6401a2c2cdb38365f8d2d5142b4589b',
  logIndex: 0,

  identity:
    '4663:64533057:0x0bd29592897611def79454353228d1b8d6401a2c2cdb38365f8d2d5142b4589b:0',
};

test('formation timeline connects pool initialization to liquidity formation', () => {
  const timeline = createFormationTimeline(formationEvent);

  const next = appendTimelineEvent(
    timeline,
    liquidityEvent
  );

  assert.equal(timeline.events.length, 1);
  assert.equal(next.events.length, 2);

  assert.equal(
    next.events[0].eventType,
    'POOL_INITIALIZED'
  );

  assert.equal(
    next.events[1].eventType,
    'LIQUIDITY_MODIFIED'
  );

  assert.equal(
    next.events[1].poolId,
    next.events[0].poolId
  );

  assert.equal(
    next.events[1].chainId,
    next.events[0].chainId
  );
});

test('liquidity formation preserves provenance', () => {
  const timeline = createFormationTimeline(
    formationEvent
  );

  const next = appendTimelineEvent(
    timeline,
    liquidityEvent
  );

  const event = next.events[1];

  assert.equal(event.chainId, 4663);
  assert.equal(event.poolId, pool.poolId);
  assert.equal(event.blockNumber, 64533057);
  assert.equal(
    event.transactionHash,
    liquidityEvent.transactionHash
  );
  assert.equal(event.logIndex, 0);
  assert.equal(
    event.liquidityDelta,
    '1000000000000000000000'
  );
});

test('formation timeline remains immutable after liquidity append', () => {
  const timeline = createFormationTimeline(
    formationEvent
  );

  appendTimelineEvent(
    timeline,
    liquidityEvent
  );

  assert.equal(timeline.events.length, 1);
  assert.equal(
    timeline.events[0].eventType,
    'POOL_INITIALIZED'
  );
});
