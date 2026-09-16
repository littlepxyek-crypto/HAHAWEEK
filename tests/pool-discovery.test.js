'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CHAIN_ID,
  POOL_MANAGER,
  discoverPool,
} = require('../src/core/pool-discovery');

const fixture = require('./fixtures/initialize-live.json');

test('pool discovery creates normalized pool record', () => {
  const pool = discoverPool(fixture);

  assert.equal(pool.chainId, CHAIN_ID);
  assert.equal(
    pool.poolManager.toLowerCase(),
    POOL_MANAGER.toLowerCase()
  );

  assert.equal(
    pool.poolId.toLowerCase(),
    fixture.topics[1].toLowerCase()
  );

  assert.equal(
    pool.currency0.toLowerCase(),
    '0x287aaf654bcae268d0d9a973013293fb1b2e3de4'
  );

  assert.equal(
    pool.currency1.toLowerCase(),
    '0x5fc5360d0400a0fd4f2af552add042d716f1d168'
  );

  assert.equal(pool.fee, '0');
  assert.equal(pool.tickSpacing, '60');
  assert.equal(pool.tick, '0');

  assert.equal(pool.blockNumber, fixture.blockNumber);
  assert.equal(
    pool.transactionHash.toLowerCase(),
    fixture.transactionHash.toLowerCase()
  );
  assert.equal(pool.logIndex, fixture.index);
});

test('pool discovery rejects another contract', () => {
  const broken = {
    ...fixture,
    address: '0x0000000000000000000000000000000000000001',
  };

  assert.throws(
    () => discoverPool(broken),
    /INVALID_POOL_MANAGER/
  );
});

test('pool discovery rejects another event', () => {
  const broken = {
    ...fixture,
    topics: [
      '0x' + '00'.repeat(32),
      ...fixture.topics.slice(1),
    ],
  };

  assert.throws(
    () => discoverPool(broken),
    /NOT_INITIALIZE_EVENT/
  );
});
