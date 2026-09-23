'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFencedIngestionEngine } = require('../src/core/fenced-ingestion');

function makeCursor(initial = 100) {
  let value = initial;
  return {
    get: () => value,
    initialize: block => { value = block; },
    advance: block => { value = block; }
  };
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

test('actual IngestionEngine: evidence commit occurs before cursor advance', async () => {
  const lease = makeLease();
  const token = lease.acquire('writer-A');
  const cursor = makeCursor();
  const durableEvidence = [];

  const engine = createFencedIngestionEngine({
    lease,
    leaseToken: token,
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async block => {
      durableEvidence.push(block);
    }
  });

  const result = await engine.runOnce();

  assert.equal(result.processed, 1);
  assert.deepEqual(durableEvidence, [101]);
  assert.equal(cursor.get(), 101);
});

test('actual IngestionEngine: fence loss after evidence commit blocks cursor advancement', async () => {
  const lease = makeLease();
  const token = lease.acquire('writer-A');
  const cursor = makeCursor();
  const durableEvidence = [];

  const engine = createFencedIngestionEngine({
    lease,
    leaseToken: token,
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async block => {
      durableEvidence.push(block);
      lease.replace('writer-B');
    }
  });

  await assert.rejects(() => engine.runOnce(), error => {
    assert.equal(error.code, 'FENCE_REJECTED');
    return true;
  });

  assert.deepEqual(durableEvidence, [101]);
  assert.equal(cursor.get(), 100);
});

test('actual IngestionEngine: failed evidence commit blocks cursor advancement', async () => {
  const lease = makeLease();
  const token = lease.acquire('writer-A');
  const cursor = makeCursor();

  const engine = createFencedIngestionEngine({
    lease,
    leaseToken: token,
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async () => {
      throw Object.assign(new Error('EVIDENCE_COMMIT_FAILED'), {
        code: 'EVIDENCE_COMMIT_FAILED'
      });
    }
  });

  await assert.rejects(() => engine.runOnce(), error => {
    assert.equal(error.code, 'EVIDENCE_COMMIT_FAILED');
    return true;
  });

  assert.equal(cursor.get(), 100);
});

test('actual IngestionEngine: range fencing checks ownership after durable processing', async () => {
  const lease = makeLease();
  const token = lease.acquire('writer-A');
  const cursor = makeCursor();
  const durableEvidence = [];

  const engine = createFencedIngestionEngine({
    lease,
    leaseToken: token,
    provider: { async getBlockNumber() { return 102; } },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async (fromBlock, toBlock) => {
      durableEvidence.push([fromBlock, toBlock]);
      lease.replace('writer-B');
    },
    batchSize: 2
  });

  await assert.rejects(() => engine.runOnce(), error => {
    assert.equal(error.code, 'FENCE_REJECTED');
    return true;
  });

  assert.deepEqual(durableEvidence, [[101, 102]]);
  assert.equal(cursor.get(), 100);
});
