'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createFormationEvent,
} = require('../src/core/formation-event');

function fixture() {
  return {
    chainId: 4663,
    poolManager:
      '0x8366a39cc670b4001a1121b8f6a443a643e40951',

    poolId:
      '0xa746465667b51cc3d4c9f428964994c33c9f268cb2bdb27f3589c0f7359d14e0c',

    currency0:
      '0x04f420de29f6340d63a48f791f2228db9172bd2c',

    currency1:
      '0x5fc5360d0400a0fd4f2faf552add042d716f1d168',

    fee: 989999,
    tickSpacing: 9900,

    hooks:
      '0x0000000000000000000000000000000000000000',

    sqrtPriceX96: '114808469755560221585',
    tick: -407067,

    blockNumber: 64509423,

    transactionHash:
      '0x76cb51c24c1fa3829af16d4d82118b3b7ebffd72c06a8410e9c725f6e7ec2842',

    logIndex: 37,

    identity: {
      canonicalId:
        '4663:0xa746465667b51cc3d4c9f428964994c33c9f268cb2bdb27f3589c0f7359d14e0c',
    },
  };
}

test('formation event is deterministic', () => {
  const a = createFormationEvent(fixture());
  const b = createFormationEvent(fixture());

  assert.deepEqual(a, b);
});

test('formation event has stable event identity', () => {
  const event = createFormationEvent(fixture());

  assert.equal(
    event.eventId,
    [
      4663,
      64509423,
      fixture().transactionHash.toLowerCase(),
      37,
    ].join(':')
  );
});

test('formation event identifies pool initialization', () => {
  const event = createFormationEvent(fixture());

  assert.equal(event.eventType, 'POOL_INITIALIZED');
  assert.equal(event.stage, 'FORMATION');
});

test('formation event preserves blockchain provenance', () => {
  const event = createFormationEvent(fixture());

  assert.equal(event.chainId, 4663);
  assert.equal(event.blockNumber, 64509423);
  assert.equal(event.logIndex, 37);
  assert.equal(
    event.transactionHash,
    fixture().transactionHash.toLowerCase()
  );
});

test('formation event rejects missing pool id', () => {
  const broken = fixture();
  delete broken.poolId;

  assert.throws(
    () => createFormationEvent(broken),
    /INVALID_POOL_ID/
  );
});

test('formation event rejects invalid block number', () => {
  const broken = fixture();
  broken.blockNumber = -1;

  assert.throws(
    () => createFormationEvent(broken),
    /INVALID_BLOCK_NUMBER/
  );
});

test('formation event rejects invalid log index', () => {
  const broken = fixture();
  broken.logIndex = -1;

  assert.throws(
    () => createFormationEvent(broken),
    /INVALID_LOG_INDEX/
  );
});
