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

function makeEngine({ cursor, evidence, crashAfterCommit = false }) {
  let committed = false;
  return new IngestionEngine({
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async (from, to) => {
      if (!evidence.has(to)) {
        evidence.set(to, { blockNumber: to, durable: true });
      }
      committed = true;
      if (crashAfterCommit) {
        throw new Error('SIMULATED_CRASH_AFTER_EVIDENCE_COMMIT');
      }
    },
    batchSize: 1,
    identityProvider: async block => identity(block),
    identityBoundary: evaluateIdentityAwareBoundary
  });
}

test('identity-aware batch crash after evidence commit cannot advance cursor', async () => {
  const cursor = makeCursor(100);
  const evidence = new Map();
  const engine = makeEngine({ cursor, evidence, crashAfterCommit: true });

  await assert.rejects(
    () => engine.runOnce(),
    /SIMULATED_CRASH_AFTER_EVIDENCE_COMMIT/
  );

  assert.equal(cursor.get(), 100);
  assert.deepEqual(evidence.get(101), { blockNumber: 101, durable: true });
});

test('identity-aware batch restart replays durable evidence without cursor loss', async () => {
  const cursor = makeCursor(100);
  const evidence = new Map();
  const first = makeEngine({ cursor, evidence, crashAfterCommit: true });

  await assert.rejects(() => first.runOnce(), /SIMULATED_CRASH_AFTER_EVIDENCE_COMMIT/);
  assert.equal(cursor.get(), 100);

  const replayed = [];
  const second = new IngestionEngine({
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async (from, to) => {
      replayed.push([from, to]);
      assert.deepEqual(evidence.get(to), { blockNumber: to, durable: true });
    },
    batchSize: 1,
    identityProvider: async block => identity(block),
    identityBoundary: evaluateIdentityAwareBoundary
  });

  const result = await second.runOnce();

  assert.deepEqual(replayed, [[101, 101]]);
  assert.equal(result.cursor, 101);
  assert.deepEqual(evidence.get(101), { blockNumber: 101, durable: true });
});

test('identity-aware batch commit failure leaves cursor at prior durable boundary', async () => {
  const cursor = makeCursor(100);
  const evidence = new Map();
  const engine = new IngestionEngine({
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async () => {
      evidence.set(101, { blockNumber: 101, durable: false });
      throw new Error('EVIDENCE_COMMIT_FAILED');
    },
    batchSize: 1,
    identityProvider: async block => identity(block),
    identityBoundary: evaluateIdentityAwareBoundary
  });

  await assert.rejects(() => engine.runOnce(), /EVIDENCE_COMMIT_FAILED/);
  assert.equal(cursor.get(), 100);
});
