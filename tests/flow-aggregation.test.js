'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  aggregateSwapFlow,
} = require('../src/core/flow-aggregation');

const POOL_ID =
  '0x' + '11'.repeat(32);

function swap(overrides = {}) {
  return {
    eventType: 'SWAP',
    stage: 'FLOW',
    chainId: 4663,
    poolId: POOL_ID,
    sender: '0x' + '22'.repeat(20),
    amount0: '1000',
    amount1: '-500',
    blockNumber: 100,
    ...overrides,
  };
}

test('aggregates swap counts and signed amounts', () => {
  const result =
    aggregateSwapFlow([
      swap(),
      swap({
        sender: '0x' + '33'.repeat(20),
        amount0: '-300',
        amount1: '200',
        blockNumber: 101,
      }),
      swap({
        sender: '0x' + '22'.repeat(20),
        amount0: '0',
        amount1: '0',
        blockNumber: 105,
      }),
    ]);

  assert.equal(result.version, 1);
  assert.equal(result.aggregationType, 'SWAP_FLOW');

  assert.equal(result.chainId, 4663);
  assert.equal(result.poolId, POOL_ID);

  assert.equal(result.swapCount, 3);
  assert.equal(result.uniqueSenderCount, 2);

  assert.equal(result.totalAmount0, '700');
  assert.equal(result.totalAmount1, '-300');

  assert.deepEqual(
    result.amount0DirectionCounts,
    {
      positive: 1,
      negative: 1,
      zero: 1,
    }
  );

  assert.deepEqual(
    result.amount1DirectionCounts,
    {
      positive: 1,
      negative: 1,
      zero: 1,
    }
  );

  assert.equal(result.firstBlock, 100);
  assert.equal(result.lastBlock, 105);
});

test('is deterministic', () => {
  const events = [
    swap(),
    swap({
      amount0: '-100',
      amount1: '50',
      blockNumber: 101,
    }),
  ];

  const a = aggregateSwapFlow(events);
  const b = aggregateSwapFlow(events);

  assert.deepEqual(a, b);
});

test('rejects different chain', () => {
  assert.throws(
    () =>
      aggregateSwapFlow([
        swap(),
        swap({
          chainId: 1,
          blockNumber: 101,
        }),
      ]),
    /CHAIN_ID_MISMATCH/
  );
});

test('rejects different pool', () => {
  assert.throws(
    () =>
      aggregateSwapFlow([
        swap(),
        swap({
          poolId: '0x' + '44'.repeat(32),
          blockNumber: 101,
        }),
      ]),
    /POOL_ID_MISMATCH/
  );
});

test('rejects non-SWAP event', () => {
  assert.throws(
    () =>
      aggregateSwapFlow([
        swap({
          eventType: 'LIQUIDITY_MODIFIED',
        }),
      ]),
    /INVALID_SWAP_EVENT_TYPE/
  );
});

test('preserves large integer precision', () => {
  const huge =
    '130434244450401366169';

  const result =
    aggregateSwapFlow([
      swap({
        amount0: huge,
        amount1: '-999999999999999999999999999',
      }),
    ]);

  assert.equal(
    result.totalAmount0,
    huge
  );

  assert.equal(
    result.totalAmount1,
    '-999999999999999999999999999'
  );
});

test('rejects empty events', () => {
  assert.throws(
    () => aggregateSwapFlow([]),
    /SWAP_EVENTS_EMPTY/
  );
});
