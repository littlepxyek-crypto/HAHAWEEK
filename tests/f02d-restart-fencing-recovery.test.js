'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { IngestionEngine } = require('../src/core/ingestion');
const { evaluateIdentityAwareBoundary } = require('../src/core/identity-aware-ingestion-boundary');

function makeCursor(initial = 100) {
  let value = initial;
  return {
    get: () => value,
    initialize: block => { value = block; },
    advance: block => { value = block; }
  };
}

function identity(block) {
  return {
    chainId: 4663,
    blockNumber: block,
    blockHash: '0x' + block,
    parentHash: block === 100 ? '0x99' : '0x' + (block - 1),
    observedAt: '2026-09-21T00:00:00.000Z'
  };
}

function makeEngine({ cursor, evidence, lease, token, crashAfterCommit = false }) {
  return new IngestionEngine({
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async (from, to) => {
      lease.assertOwner(token);
      if (!evidence.has(to)) {
        evidence.set(to, { blockNumber: to, durable: true });
      }
      if (crashAfterCommit) {
        throw new Error('SIMULATED_CRASH_AFTER_EVIDENCE_COMMIT');
      }
      lease.assertOwner(token);
    },
    batchSize: 1,
    identityProvider: async block => identity(block),
    identityBoundary: evaluateIdentityAwareBoundary
  });
}

function makeLease() {
  let current = null;
  let epoch = 0;
  return {
    acquire(owner) {
      current = { owner, epoch: ++epoch };
      return current;
    },
    replace(owner) {
      current = { owner, epoch: ++epoch };
      return current;
    },
    assertOwner(token) {
      if (!current || token.owner !== current.owner || token.epoch !== current.epoch) {
        throw Object.assign(new Error('FENCE_REJECTED'), { code: 'FENCE_REJECTED' });
      }
    }
  };
}

test('restart recovery preserves durable evidence and advances only after valid lease', async () => {
  const cursor = makeCursor(100);
  const evidence = new Map();
  const lease = makeLease();
  const token = lease.acquire('writer-A');

  const first = makeEngine({ cursor, evidence, lease, token, crashAfterCommit: true });
  await assert.rejects(() => first.runOnce(), /SIMULATED_CRASH_AFTER_EVIDENCE_COMMIT/);

  assert.equal(cursor.get(), 100);
  assert.deepEqual(evidence.get(101), { blockNumber: 101, durable: true });

  const newToken = lease.replace('writer-B');
  const replayed = [];

  const second = new IngestionEngine({
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async (from, to) => {
      lease.assertOwner(newToken);
      replayed.push([from, to]);
      assert.deepEqual(evidence.get(to), { blockNumber: to, durable: true });
      lease.assertOwner(newToken);
    },
    batchSize: 1,
    identityProvider: async block => identity(block),
    identityBoundary: evaluateIdentityAwareBoundary
  });

  const result = await second.runOnce();

  assert.deepEqual(replayed, [[101, 101]]);
  assert.equal(result.cursor, 101);
});

test('stale writer cannot advance cursor after restart ownership changes', async () => {
  const cursor = makeCursor(100);
  const evidence = new Map();
  const lease = makeLease();
  const token = lease.acquire('writer-A');

  const first = makeEngine({ cursor, evidence, lease, token });
  lease.replace('writer-B');

  await assert.rejects(() => first.runOnce(), /FENCE_REJECTED/);
  assert.equal(cursor.get(), 100);
  assert.equal(evidence.has(101), false);
});

test('lease loss after durable evidence preserves evidence and cursor boundary', async () => {
  const cursor = makeCursor(100);
  const evidence = new Map();
  const lease = makeLease();
  const token = lease.acquire('writer-A');

  const engine = new IngestionEngine({
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async (from, to) => {
      lease.assertOwner(token);
      evidence.set(to, { blockNumber: to, durable: true });
      lease.replace('writer-B');
      lease.assertOwner(token);
    },
    batchSize: 1,
    identityProvider: async block => identity(block),
    identityBoundary: evaluateIdentityAwareBoundary
  });

  await assert.rejects(() => engine.runOnce(), /FENCE_REJECTED/);
  assert.deepEqual(evidence.get(101), { blockNumber: 101, durable: true });
  assert.equal(cursor.get(), 100);
});
