'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ethers } = require('ethers');

const {
  SWAP_TOPIC0,
  createSwapEvent,
} = require('../src/core/swap-event');

const ABI = [
  'event Swap(bytes32 indexed id,address indexed sender,int128 amount0,int128 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick,uint24 fee)'
];

const iface = new ethers.Interface(ABI);

const pool = {
  chainId: 4663,
  poolManager: '0x8366a39cc670b4001a1121b8f6a443a643e40951',
  poolId: '0x' + '11'.repeat(32),
};

function makeLog(overrides = {}) {
  const encoded = iface.encodeEventLog(
    iface.getEvent('Swap'),
    [
      pool.poolId,
      '0x' + '22'.repeat(20),
      1000,
      -500,
      79228162514264337593543950336n,
      123456789n,
      -123,
      3000,
    ]
  );

  return {
    address: pool.poolManager,
    topics: encoded.topics,
    data: encoded.data,
    blockNumber: 100,
    transactionHash: '0x' + '33'.repeat(32),
    index: 7,
    ...overrides,
  };
}

test('SWAP topic is deterministic', () => {
  assert.match(SWAP_TOPIC0, /^0x[0-9a-f]{64}$/);
});

test('decodes Swap and preserves provenance', () => {
  const event = createSwapEvent(
    makeLog(),
    pool
  );

  assert.equal(event.eventType, 'SWAP');
  assert.equal(event.stage, 'FLOW');
  assert.equal(event.chainId, 4663);
  assert.equal(event.poolId, pool.poolId);
  assert.equal(event.amount0, '1000');
  assert.equal(event.amount1, '-500');
  assert.equal(event.tick, -123);
  assert.equal(event.fee, 3000);
  assert.equal(event.blockNumber, 100);
  assert.equal(event.logIndex, 7);
});

test('rejects wrong PoolManager', () => {
  assert.throws(
    () =>
      createSwapEvent(
        makeLog({
          address: '0x' + '44'.repeat(20),
        }),
        pool
      ),
    /POOL_MANAGER_MISMATCH/
  );
});

test('rejects wrong topic count', () => {
  assert.throws(
    () =>
      createSwapEvent(
        makeLog({
          topics: [makeLog().topics[0]],
        }),
        pool
      ),
    /INVALID_SWAP_TOPIC_COUNT/
  );
});

test('rejects wrong pool id', () => {
  const otherPool = {
    ...pool,
    poolId: '0x' + '55'.repeat(32),
  };

  assert.throws(
    () =>
      createSwapEvent(
        makeLog(),
        otherPool
      ),
    /POOL_ID_MISMATCH/
  );
});

test('rejects invalid topic0', () => {
  const log = makeLog();
  log.topics[0] = '0x' + '66'.repeat(32);

  assert.throws(
    () => createSwapEvent(log, pool),
    /INVALID_SWAP_TOPIC0/
  );
});
