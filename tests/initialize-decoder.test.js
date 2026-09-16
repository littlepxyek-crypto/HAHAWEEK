'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TOPIC0,
  decodeInitializeLog,
} = require('../src/core/initialize-decoder');

const fixture = require('./fixtures/initialize-live.json');

test('Initialize decoder matches captured Robinhood evidence', () => {
  const decoded = decodeInitializeLog(fixture);

  assert.equal(decoded.eventName, 'Initialize');
  assert.equal(decoded.topic0.toLowerCase(), TOPIC0.toLowerCase());

  assert.equal(
    decoded.poolId.toLowerCase(),
    '0xd036295aeac86cbb4a04c4760026aef82b3e2ef14283f80bdd6e7d686ad48426'
  );

  assert.equal(
    decoded.currency0.toLowerCase(),
    '0x287aaf654bcae268d0d9a973013293fb1b2e3de4'
  );

  assert.equal(
    decoded.currency1.toLowerCase(),
    '0x5fc5360d0400a0fd4f2af552add042d716f1d168'
  );

  assert.equal(decoded.fee, '0');
  assert.equal(decoded.tickSpacing, '60');

  assert.equal(
    decoded.hooks.toLowerCase(),
    '0x219b93d7c067f3ccc9e25aecdbecf1279d1fc888'
  );

  assert.equal(decoded.sqrtPriceX96, '79228162514264337593543950336');
  assert.equal(decoded.tick, '0');
});

test('Initialize decoder rejects wrong topic count', () => {
  const broken = {
    ...fixture,
    topics: fixture.topics.slice(0, 3),
  };

  assert.throws(
    () => decodeInitializeLog(broken),
    /INVALID_INITIALIZE_TOPIC_COUNT/
  );
});

test('Initialize decoder rejects wrong data length', () => {
  const broken = {
    ...fixture,
    data: '0x00',
  };

  assert.throws(
    () => decodeInitializeLog(broken),
    /INVALID_INITIALIZE_DATA_LENGTH/
  );
});

test('Initialize decoder rejects wrong topic0', () => {
  const broken = {
    ...fixture,
    topics: [
      '0x' + '00'.repeat(32),
      ...fixture.topics.slice(1),
    ],
  };

  assert.throws(
    () => decodeInitializeLog(broken),
    /INVALID_INITIALIZE_TOPIC0/
  );
});
