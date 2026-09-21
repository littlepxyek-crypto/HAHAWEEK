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
      epoch += 1;
      current = { owner, epoch };
      return current;
    },
    assertOwner(token) {
      if (!current || token.owner !== current.owner || token.epoch !== current.epoch) {
        throw Object.assign(new Error('FENCE_REJECTED'), { code: 'FENCE_REJECTED' });
      }
    },
    replace(owner) {
      epoch += 1;
      current = { owner, epoch };
      return current;
    }
  };
}

test('fenced single-block processing rejects stale writer before processing', async () => {
  const lease = makeLease();
  const token = lease.acquire('writer-A');
  const cursor = makeCursor();
  const processed = [];

  lease.replace('writer-B');

  const engine = createFencedIngestionEngine({
    lease,
    leaseToken: token,
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async block => processed.push(block)
  });

  await assert.rejects(() => engine.runOnce(), error => {
    assert.equal(error.code, 'FENCE_REJECTED');
    return true;
  });

  assert.deepEqual(processed, []);
  assert.equal(cursor.get(), 100);
});

test('fenced range processing rejects stale writer before and after processor', async () => {
  const lease = makeLease();
  const token = lease.acquire('writer-A');
  const cursor = makeCursor();
  let calls = 0;

  const engine = createFencedIngestionEngine({
    lease,
    leaseToken: token,
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async () => {
      calls += 1;
      lease.replace('writer-B');
    },
    batchSize: 1
  });

  await assert.rejects(() => engine.runOnce(), error => {
    assert.equal(error.code, 'FENCE_REJECTED');
    return true;
  });

  assert.equal(calls, 1);
  assert.equal(cursor.get(), 100);
});

test('fenced wrapper requires lease and token', () => {
  assert.throws(() => createFencedIngestionEngine({
    provider: {},
    cursor: {},
    confirmations: 0,
    processor: async () => {}
  }), /LEASE_REQUIRED/);
});
