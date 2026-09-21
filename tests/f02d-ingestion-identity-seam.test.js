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

test('gated identity seam preserves legacy behavior when disabled', async () => {
  const cursor = makeCursor(100);
  const processed = [];
  const engine = new IngestionEngine({
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async block => processed.push(block)
  });
  const result = await engine.runOnce();
  assert.deepEqual(processed, [101]);
  assert.equal(result.cursor, 101);
});

test('identity seam permits continuous block before processing', async () => {
  const cursor = makeCursor(100);
  const processed = [];
  const engine = new IngestionEngine({
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async block => processed.push(block),
    identityProvider: async block => identity(block),
    identityBoundary: evaluateIdentityAwareBoundary
  });
  const result = await engine.runOnce();
  assert.deepEqual(processed, [101]);
  assert.equal(result.cursor, 101);
});

test('identity seam blocks reorg before processor or cursor advance', async () => {
  const cursor = makeCursor(100);
  const processed = [];
  const engine = new IngestionEngine({
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async block => processed.push(block),
    identityProvider: async block => block === 100 ? identity(100) : identity(101, '0xfork'),
    identityBoundary: evaluateIdentityAwareBoundary
  });
  await assert.rejects(() => engine.runOnce(), error => {
    assert.equal(error.code, 'STOP_REORG');
    return true;
  });
  assert.deepEqual(processed, []);
  assert.equal(cursor.get(), 100);
});

test('identity seam fails closed on identity acquisition failure', async () => {
  const cursor = makeCursor(100);
  const processed = [];
  const engine = new IngestionEngine({
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async block => processed.push(block),
    identityProvider: async () => ({ blockNumber: 101 }),
    identityBoundary: evaluateIdentityAwareBoundary
  });
  await assert.rejects(() => engine.runOnce(), error => {
    assert.equal(error.code, 'FAIL_CLOSED');
    return true;
  });
  assert.deepEqual(processed, []);
  assert.equal(cursor.get(), 100);
});
