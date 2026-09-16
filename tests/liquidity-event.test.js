'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MODIFY_LIQUIDITY_TOPIC0,
  createLiquidityEvent,
} = require('../src/core/liquidity-event');

const { ethers } = require('ethers');

const ABI = [
  'event ModifyLiquidity(bytes32 indexed id,address indexed sender,int24 tickLower,int24 tickUpper,int256 liquidityDelta,bytes32 salt)'
];

const iface = new ethers.Interface(ABI);

const pool = {
  chainId: 4663,
  poolManager: '0x8366a39cc670b4001a1121b8f6a443a643e40951',
  poolId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
};

const sender = '0x1111111111111111111111111111111111111111';

function fixture() {
  const encoded = iface.encodeEventLog(
    iface.getEvent('ModifyLiquidity'),
    [
      pool.poolId,
      sender,
      -600,
      600,
      123456789n,
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    ]
  );

  return {
    address: pool.poolManager,
    topics: encoded.topics,
    data: encoded.data,
    blockNumber: 200,
    transactionHash:
      '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    index: 7,
  };
}

test('ModifyLiquidity topic is deterministic', () => {
  assert.equal(
    MODIFY_LIQUIDITY_TOPIC0,
    iface.getEvent('ModifyLiquidity').topicHash
  );
});

test('liquidity event decodes and preserves provenance', () => {
  const event = createLiquidityEvent(fixture(), pool);

  assert.equal(event.eventType, 'LIQUIDITY_MODIFIED');
  assert.equal(event.stage, 'FORMATION');
  assert.equal(event.chainId, 4663);
  assert.equal(event.poolId, pool.poolId);
  assert.equal(event.sender, sender);
  assert.equal(event.tickLower, -600);
  assert.equal(event.tickUpper, 600);
  assert.equal(event.liquidityDelta, '123456789');
  assert.equal(event.blockNumber, 200);
  assert.equal(event.logIndex, 7);

  assert.equal(
    event.identity,
    `4663:200:${fixture().transactionHash}:7`
  );
});

test('liquidity event rejects wrong pool manager', () => {
  const log = fixture();

  assert.throws(
    () =>
      createLiquidityEvent(
        {
          ...log,
          address: '0x2222222222222222222222222222222222222222',
        },
        pool
      ),
    /POOL_MANAGER_MISMATCH/
  );
});

test('liquidity event rejects wrong topic count', () => {
  const log = fixture();

  assert.throws(
    () =>
      createLiquidityEvent(
        {
          ...log,
          topics: log.topics.slice(0, 2),
        },
        pool
      ),
    /INVALID_MODIFY_LIQUIDITY_TOPIC_COUNT/
  );
});

test('liquidity event rejects wrong topic0', () => {
  const log = fixture();

  assert.throws(
    () =>
      createLiquidityEvent(
        {
          ...log,
          topics: [
            ethers.ZeroHash,
            ...log.topics.slice(1),
          ],
        },
        pool
      ),
    /INVALID_MODIFY_LIQUIDITY_TOPIC0/
  );
});

test('liquidity event rejects wrong pool id', () => {
  const log = fixture();

  assert.throws(
    () =>
      createLiquidityEvent(
        log,
        {
          ...pool,
          poolId:
            '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        }
      ),
    /POOL_ID_MISMATCH/
  );
});
