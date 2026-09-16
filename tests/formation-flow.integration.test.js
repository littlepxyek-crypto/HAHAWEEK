'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createFormationTimeline,
  appendTimelineEvent,
} = require('../src/core/formation-timeline');

const {
  createFormationEvent,
} = require('../src/core/formation-event');

const {
  createLiquidityEvent,
} = require('../src/core/liquidity-event');

const {
  createSwapEvent,
} = require('../src/core/swap-event');

const { ethers } = require('ethers');

const POOL_MANAGER =
  '0x8366a39cc670b4001a1121b8f6a443a643e40951';

const pool = {
  chainId: 4663,
  poolManager: POOL_MANAGER,
  poolId: '0x' + '11'.repeat(32),

  currency0: '0x' + '22'.repeat(20),
  currency1: '0x' + '33'.repeat(20),

  fee: 3000,
  tickSpacing: 60,
  hooks: '0x' + '00'.repeat(20),

  sqrtPriceX96:
    '79228162514264337593543950336',

  tick: 0,

  blockNumber: 100,
  transactionHash: '0x' + '44'.repeat(32),
  logIndex: 1,

  identity: {
    chainId: 4663,
    poolId: '0x' + '11'.repeat(32),
  },
};

function makeLiquidityLog() {
  const iface = new ethers.Interface([
    'event ModifyLiquidity(bytes32 indexed id,address indexed sender,int24 tickLower,int24 tickUpper,int256 liquidityDelta,bytes32 salt)'
  ]);

  const encoded =
    iface.encodeEventLog(
      iface.getEvent('ModifyLiquidity'),
      [
        pool.poolId,
        '0x' + '55'.repeat(20),
        -120,
        120,
        1000000n,
        '0x' + '00'.repeat(32),
      ]
    );

  return {
    address: POOL_MANAGER,
    topics: encoded.topics,
    data: encoded.data,
    blockNumber: 101,
    transactionHash: '0x' + '66'.repeat(32),
    index: 0,
  };
}

function makeSwapLog() {
  const iface = new ethers.Interface([
    'event Swap(bytes32 indexed id,address indexed sender,int128 amount0,int128 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick,uint24 fee)'
  ]);

  const encoded =
    iface.encodeEventLog(
      iface.getEvent('Swap'),
      [
        pool.poolId,
        '0x' + '77'.repeat(20),
        1000,
        -500,
        79228162514264337593543950336n,
        1000000n,
        1,
        3000,
      ]
    );

  return {
    address: POOL_MANAGER,
    topics: encoded.topics,
    data: encoded.data,
    blockNumber: 102,
    transactionHash: '0x' + '88'.repeat(32),
    index: 0,
  };
}

test('formation flow builds INITIALIZE -> LIQUIDITY -> SWAP timeline', () => {
  const formation =
    createFormationEvent(pool);

  const liquidity =
    createLiquidityEvent(
      makeLiquidityLog(),
      pool
    );

  const swap =
    createSwapEvent(
      makeSwapLog(),
      pool
    );

  let timeline =
    createFormationTimeline(
      formation
    );

  timeline =
    appendTimelineEvent(
      timeline,
      liquidity
    );

  timeline =
    appendTimelineEvent(
      timeline,
      swap
    );

  assert.equal(
    timeline.chainId,
    4663
  );

  assert.equal(
    timeline.poolId,
    pool.poolId
  );

  assert.equal(
    timeline.events.length,
    3
  );

  assert.equal(
    timeline.events[0].eventType,
    'POOL_INITIALIZED'
  );

  assert.equal(
    timeline.events[1].eventType,
    'LIQUIDITY_MODIFIED'
  );

  assert.equal(
    timeline.events[2].eventType,
    'SWAP'
  );

  assert.equal(
    timeline.events[0].blockNumber,
    100
  );

  assert.equal(
    timeline.events[1].blockNumber,
    101
  );

  assert.equal(
    timeline.events[2].blockNumber,
    102
  );

  assert.equal(
    timeline.events[0].sequence,
    0
  );

  assert.equal(
    timeline.events[1].sequence,
    1
  );

  assert.equal(
    timeline.events[2].sequence,
    2
  );
});

test('formation flow rejects different pool', () => {
  const formation =
    createFormationEvent(pool);

  let timeline =
    createFormationTimeline(
      formation
    );

  const otherPoolEvent = {
    chainId: 4663,
    poolId: '0x' + '99'.repeat(32),
    blockNumber: 101,
    eventType: 'SWAP',
  };

  assert.throws(
    () =>
      appendTimelineEvent(
        timeline,
        otherPoolEvent
      ),
    /POOL_ID_MISMATCH/
  );
});

test('formation flow rejects time reversal', () => {
  const formation =
    createFormationEvent(pool);

  let timeline =
    createFormationTimeline(
      formation
    );

  const liquidity =
    createLiquidityEvent(
      makeLiquidityLog(),
      pool
    );

  timeline =
    appendTimelineEvent(
      timeline,
      liquidity
    );

  const olderSwap = {
    ...createSwapEvent(
      makeSwapLog(),
      pool
    ),
    blockNumber: 99,
  };

  assert.throws(
    () =>
      appendTimelineEvent(
        timeline,
        olderSwap
      ),
    /TIMELINE_ORDER_VIOLATION/
  );
});
