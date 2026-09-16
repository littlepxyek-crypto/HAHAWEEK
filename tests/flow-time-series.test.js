'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  floorWindow,
  aggregateFlowWindows,
} = require('../src/core/flow-time-series');

const POOL_ID =
  '0x' + '11'.repeat(32);

function swap(overrides = {}) {
  return {
    eventType: 'SWAP',
    chainId: 4663,
    poolId: POOL_ID,
    sender: '0x' + '22'.repeat(20),
    amount0: '1000',
    amount1: '-500',
    blockNumber: 100,
    timestamp: 1000,
    ...overrides,
  };
}

test('floors timestamp into deterministic window', () => {
  assert.equal(
    floorWindow(1234, 300),
    1200
  );

  assert.equal(
    floorWindow(1499, 300),
    1200
  );

  assert.equal(
    floorWindow(1500, 300),
    1500
  );
});

test('aggregates swaps into time windows', () => {
  const result =
    aggregateFlowWindows(
      [
        swap({
          timestamp: 1000,
          blockNumber: 100,
        }),

        swap({
          timestamp: 1100,
          blockNumber: 101,
          sender:
            '0x' + '33'.repeat(20),
          amount0: '200',
          amount1: '-100',
        }),

        swap({
          timestamp: 1300,
          blockNumber: 105,
          sender:
            '0x' + '22'.repeat(20),
          amount0: '-50',
          amount1: '25',
        }),
      ],
      300
    );

  assert.equal(
    result.length,
    2
  );

  assert.equal(
    result[0].windowStart,
    900
  );

  assert.equal(
    result[0].windowEnd,
    1200
  );

  assert.equal(
    result[0].swapCount,
    2
  );

  assert.equal(
    result[0].uniqueSenderCount,
    2
  );

  assert.equal(
    result[0].totalAmount0,
    '1200'
  );

  assert.equal(
    result[0].totalAmount1,
    '-600'
  );

  assert.equal(
    result[0].firstBlock,
    100
  );

  assert.equal(
    result[0].lastBlock,
    101
  );

  assert.equal(
    result[1].windowStart,
    1200
  );

  assert.equal(
    result[1].swapCount,
    1
  );

  assert.equal(
    result[1].totalAmount0,
    '-50'
  );

  assert.equal(
    result[1].totalAmount1,
    '25'
  );
});

test('keeps windows sorted chronologically', () => {
  const result =
    aggregateFlowWindows(
      [
        swap({
          timestamp: 1600,
          blockNumber: 110,
        }),
        swap({
          timestamp: 1000,
          blockNumber: 100,
        }),
      ],
      300
    );

  assert.equal(
    result[0].windowStart,
    900
  );

  assert.equal(
    result[1].windowStart,
    1500
  );
});

test('preserves large integer precision', () => {
  const result =
    aggregateFlowWindows(
      [
        swap({
          amount0:
            '130434244450401366169',
          amount1:
            '-999999999999999999999999999',
        }),
      ],
      300
    );

  assert.equal(
    result[0].totalAmount0,
    '130434244450401366169'
  );

  assert.equal(
    result[0].totalAmount1,
    '-999999999999999999999999999'
  );
});

test('rejects different pool', () => {
  assert.throws(
    () =>
      aggregateFlowWindows(
        [
          swap(),
          swap({
            poolId:
              '0x' + '44'.repeat(32),
          }),
        ],
        300
      ),
    /POOL_ID_MISMATCH/
  );
});

test('rejects different chain', () => {
  assert.throws(
    () =>
      aggregateFlowWindows(
        [
          swap(),
          swap({
            chainId: 1,
          }),
        ],
        300
      ),
    /CHAIN_ID_MISMATCH/
  );
});

test('rejects invalid timestamp', () => {
  assert.throws(
    () =>
      aggregateFlowWindows(
        [
          swap({
            timestamp: -1,
          }),
        ],
        300
      ),
    /INVALID_TIMESTAMP/
  );
});

test('rejects invalid window', () => {
  assert.throws(
    () =>
      aggregateFlowWindows(
        [swap()],
        0
      ),
    /INVALID_WINDOW_SECONDS/
  );
});

test('is deterministic', () => {
  const events = [
    swap({
      timestamp: 1000,
    }),
    swap({
      timestamp: 1100,
    }),
  ];

  const a =
    aggregateFlowWindows(
      events,
      300
    );

  const b =
    aggregateFlowWindows(
      events,
      300
    );

  assert.deepEqual(a, b);
});
