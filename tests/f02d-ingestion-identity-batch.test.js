'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { IngestionEngine } = require('../src/core/ingestion');
const { evaluateIdentityAwareBoundary } = require('../src/core/identity-aware-ingestion-boundary');

function makeCursor(initial = null) {
  let value = initial;
  return {
    get: () => value,
    initialize: block => { value = block; return block; },
    advance: block => { value = block; return block; }
  };
}

function identity(block, parent) {
  return {
    chainId: 4663,
    blockNumber: block,
    blockHash: '0x' + block,
    parentHash: parent === undefined ? (block === 100 ? '0x99' : '0x' + (block - 1)) : parent,
    observedAt: '2026-09-21T00:00:00.000Z'
  };
}

function makeEngine({ cursor, head = 102, identityProvider, processorRange, batchSize = 2 }) {
  return new IngestionEngine({
    provider: { async getBlockNumber() { return head; } },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange,
    batchSize,
    identityProvider,
    identityBoundary: evaluateIdentityAwareBoundary
  });
}

test('identity-aware batch verifies the complete range before processing', async () => {
  const cursor = makeCursor(100);
  const ranges = [];
  const engine = makeEngine({
    cursor,
    processorRange: async (from, to) => ranges.push([from, to])
  });

  const result = await engine.runOnce();

  assert.deepEqual(ranges, [[101, 102]]);
  assert.equal(result.cursor, 102);
});

test('identity-aware batch stops before processorRange on reorg inside the batch', async () => {
  const cursor = makeCursor(100);
  const ranges = [];
  const engine = makeEngine({
    cursor,
    processorRange: async (from, to) => ranges.push([from, to]),
    identityProvider: async block => {
      if (block === 102) return identity(102, '0xfork');
      return identity(block);
    }
  });

  await assert.rejects(() => engine.runOnce(), error => {
    assert.equal(error.code, 'STOP_REORG');
    assert.equal(error.blockNumber, 102);
    return true;
  });

  assert.deepEqual(ranges, []);
  assert.equal(cursor.get(), 100);
});

test('identity-aware batch fails closed and preserves cursor on invalid identity', async () => {
  const cursor = makeCursor(100);
  const ranges = [];
  const engine = makeEngine({
    cursor,
    processorRange: async (from, to) => ranges.push([from, to]),
    identityProvider: async block => block === 101 ? { blockNumber: 101 } : identity(block)
  });

  await assert.rejects(() => engine.runOnce(), error => {
    assert.equal(error.code, 'FAIL_CLOSED');
    assert.equal(error.blockNumber, 101);
    return true;
  });

  assert.deepEqual(ranges, []);
  assert.equal(cursor.get(), 100);
});

test('identity-aware batch advances only after processorRange succeeds', async () => {
  const cursor = makeCursor(100);
  const engine = makeEngine({
    cursor,
    processorRange: async () => { throw new Error('BATCH_FAILURE'); }
  });

  await assert.rejects(() => engine.runOnce(), /BATCH_FAILURE/);
  assert.equal(cursor.get(), 100);
});

test('identity-aware batch preserves legacy mode when identity seam is disabled', async () => {
  const cursor = makeCursor(100);
  const ranges = [];
  const engine = new IngestionEngine({
    provider: { async getBlockNumber() { return 102; } },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async (from, to) => ranges.push([from, to]),
    batchSize: 2
  });

  const result = await engine.runOnce();
  assert.deepEqual(ranges, [[101, 102]]);
  assert.equal(result.cursor, 102);
});
