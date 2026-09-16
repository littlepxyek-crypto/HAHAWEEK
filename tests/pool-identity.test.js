'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ZERO_ADDRESS,
  normalizeCurrency,
  createPoolIdentity,
} = require('../src/core/pool-identity');

test('native zero address normalizes to ETH', () => {
  const result = normalizeCurrency(ZERO_ADDRESS);

  assert.deepEqual(result, {
    kind: 'NATIVE_ETH',
    address: ZERO_ADDRESS,
    symbol: 'ETH',
  });
});

test('token address normalizes without losing raw address value', () => {
  const address =
    '0x287aaf654bcae268d0d9a973013293fb1b2e3de4';

  const result = normalizeCurrency(address.toUpperCase());

  assert.equal(result.kind, 'TOKEN');
  assert.equal(result.address, address);
});

test('pool identity is deterministic', () => {
  const pool = {
    chainId: 4663,
    poolId:
      '0xd036295aeac86cbb4a04c4760026aef82b3e2ef14283f80bdd6e7d686ad48426',
    currency0: ZERO_ADDRESS,
    currency1:
      '0x5fc5360d0400a0fd4f2af552add042d716f1d168',
  };

  const identity = createPoolIdentity(pool);

  assert.equal(identity.chainId, 4663);
  assert.equal(
    identity.poolId,
    pool.poolId.toLowerCase()
  );

  assert.equal(
    identity.canonicalId,
    `4663:${pool.poolId.toLowerCase()}`
  );

  assert.equal(
    identity.currency0.kind,
    'NATIVE_ETH'
  );

  assert.equal(
    identity.currency1.kind,
    'TOKEN'
  );

  assert.equal(
    identity.currency0.address,
    ZERO_ADDRESS
  );

  assert.equal(
    identity.currency1.address,
    pool.currency1
  );
});

test('invalid currency address is rejected', () => {
  assert.throws(
    () => normalizeCurrency('0x1234'),
    /INVALID_CURRENCY_ADDRESS/
  );
});

test('invalid pool id is rejected', () => {
  assert.throws(
    () => createPoolIdentity({
      chainId: 4663,
      poolId: '0x1234',
      currency0: ZERO_ADDRESS,
      currency1: ZERO_ADDRESS,
    }),
    /INVALID_POOL_ID/
  );
});
