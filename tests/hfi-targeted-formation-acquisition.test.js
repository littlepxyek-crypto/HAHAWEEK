'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { collectUntilFormationSequence } = require('../src/core/hfi-targeted-formation-acquisition');

const LIQ = '0xliq';
const SWAP = '0xswap';
const event = (blockNumber, topic, logIndex = 0) => ({ blockNumber, transactionIndex: 0, logIndex, topics: [topic] });

test('stops targeted acquisition after the first valid liquidity → swap sequence', async () => {
  const ranges = [];
  const result = await collectUntilFormationSequence({
    start: 100,
    end: 399,
    chunkSize: 100,
    liquidityTopic: LIQ,
    swapTopic: SWAP,
    fetchChunk: async (from, to) => {
      ranges.push([from, to]);
      if (from === 100) return [event(120, LIQ)];
      if (from === 200) return [event(220, SWAP)];
      throw new Error('UNEXPECTED_EXTRA_ACQUISITION');
    },
  });
  assert.deepEqual(ranges, [[100, 199], [200, 299]]);
  assert.deepEqual(result.map(x => x.topics[0]), [LIQ, SWAP]);
});

test('does not infer a valid sequence when swap precedes liquidity', async () => {
  const ranges = [];
  const result = await collectUntilFormationSequence({
    start: 100,
    end: 299,
    chunkSize: 100,
    liquidityTopic: LIQ,
    swapTopic: SWAP,
    fetchChunk: async (from, to) => {
      ranges.push([from, to]);
      if (from === 100) return [event(120, SWAP)];
      return [event(220, LIQ)];
    },
  });
  assert.deepEqual(ranges, [[100, 199], [200, 299]]);
  assert.deepEqual(result.map(x => x.topics[0]), [SWAP, LIQ]);
});

test('fails closed on invalid acquisition bounds', async () => {
  await assert.rejects(() => collectUntilFormationSequence({
    start: 10,
    end: 9,
    chunkSize: 10,
    liquidityTopic: LIQ,
    swapTopic: SWAP,
    fetchChunk: async () => [],
  }), /END_BLOCK_REQUIRED/);
});
