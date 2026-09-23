'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { IngestionEngine } = require('../src/core/ingestion');
const { evaluateIdentityAwareBoundary } = require('../src/core/identity-aware-ingestion-boundary');

function makeCursor(initial = 100) {
  let value = initial;
  return {
    get: () => value,
    initialize: block => { value = block; return block; },
    advance: block => { value = block; return block; }
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

function makeEngine({ cursor, store, incoming, processorRange }) {
  return new IngestionEngine({
    provider: { async getBlockNumber() { return 101; } },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: processorRange || (async (from, to) => {
      const existing = store.get(to);
      if (existing) {
        if (existing.digest !== incoming.digest) {
          throw Object.assign(new Error('EVIDENCE_IDENTITY_CONFLICT'), { code: 'EVIDENCE_IDENTITY_CONFLICT' });
        }
        return { inserted: false, idempotent: true };
      }
      store.set(to, incoming);
      return { inserted: true, idempotent: false };
    }),
    batchSize: 1,
    identityProvider: async block => identity(block),
    identityBoundary: evaluateIdentityAwareBoundary
  });
}

test('replay of identical evidence is idempotent and does not duplicate', async () => {
  const cursor = makeCursor();
  const store = new Map();
  const incoming = { identity: 'event-101', digest: 'digest-A' };

  const first = makeEngine({ cursor, store, incoming });
  const firstResult = await first.runOnce();

  assert.equal(firstResult.cursor, 101);
  assert.equal(store.size, 1);

  cursor.advance(100);

  const second = makeEngine({ cursor, store, incoming });
  const secondResult = await second.runOnce();

  assert.equal(secondResult.cursor, 101);
  assert.equal(store.size, 1);
  assert.deepEqual(store.get(101), incoming);
});

test('same evidence identity with different digest is isolated as conflict', async () => {
  const cursor = makeCursor();
  const store = new Map();
  const original = { identity: 'event-101', digest: 'digest-A' };
  const conflicting = { identity: 'event-101', digest: 'digest-B' };

  const first = makeEngine({ cursor, store, incoming: original });
  await first.runOnce();
  assert.equal(cursor.get(), 101);

  cursor.advance(100);

  const second = makeEngine({
    cursor,
    store,
    incoming: conflicting,
    processorRange: async () => {
      const existing = store.get(101);
      assert.ok(existing);
      if (existing.digest !== conflicting.digest) {
        throw Object.assign(new Error('EVIDENCE_IDENTITY_CONFLICT'), { code: 'EVIDENCE_IDENTITY_CONFLICT' });
      }
    }
  });

  await assert.rejects(() => second.runOnce(), error => {
    assert.equal(error.code, 'EVIDENCE_IDENTITY_CONFLICT');
    return true;
  });

  assert.equal(cursor.get(), 100);
  assert.deepEqual(store.get(101), original);
});
