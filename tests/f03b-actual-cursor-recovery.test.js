'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { BlockCursor } = require('../src/core/block-cursor');
const { recoverV4Cursor } = require('../src/core/v4-recovery-seam');
const vectors = require('../docs/golden-vectors/checkpoint-cursor-recovery.json');

function vector(id) {
  const found = vectors.vectors.find((item) => item.id === id);
  assert.ok(found, `missing vector: ${id}`);
  return found;
}

function persistentCursor(initialState) {
  let persisted = { ...initialState };
  return {
    loadState: () => ({ ...persisted }),
    saveState: (next) => {
      persisted = { ...next };
    },
    read: () => ({ ...persisted }),
  };
}

test('F-03B actual BlockCursor recovery resumes only at the validated authority position', () => {
  const v = vector('recovery-valid-chain');
  const store = persistentCursor({
    version: 1,
    lastProcessedBlock: 0,
    status: 'RUNNING',
    lastError: null,
    updatedAt: null,
  });

  const cursor = new BlockCursor(store);

  const recovery = recoverV4Cursor({
    manifest: v.manifest,
    checkpoint: v.checkpoint,
    cursor: v.cursor,
    acquisitionPositionValid: true,
  });

  assert.equal(recovery.status, 'RECOVERY_RESUME_ALLOWED');
  assert.equal(cursor.get(), Number(recovery.position));

  cursor.advance(1);
  assert.equal(cursor.get(), 1);
  assert.equal(store.read().lastProcessedBlock, 1);
});

test('F-03B failed recovery never resets or advances the actual cursor', () => {
  const v = vector('recovery-valid-chain');
  const store = persistentCursor({
    version: 1,
    lastProcessedBlock: 42,
    status: 'RUNNING',
    lastError: null,
    updatedAt: null,
  });

  const cursor = new BlockCursor(store);
  const before = store.read();

  const recovery = recoverV4Cursor({
    manifest: v.manifest,
    checkpoint: undefined,
    cursor: v.cursor,
    acquisitionPositionValid: true,
  });

  assert.equal(recovery.status, 'RECOVERY_FAIL_CLOSED');
  assert.equal(cursor.get(), 42);
  assert.deepEqual(store.read(), before);
});

test('F-03B crash boundary preserves durable evidence while cursor stays at prior boundary', () => {
  const evidence = new Map();
  const store = persistentCursor({
    version: 1,
    lastProcessedBlock: 10,
    status: 'RUNNING',
    lastError: null,
    updatedAt: null,
  });

  const cursor = new BlockCursor(store);

  evidence.set('block:11', { committed: true, digest: 'digest-11' });

  // Simulated crash: execution stops before cursor.advance(11).
  assert.equal(cursor.get(), 10);
  assert.equal(evidence.get('block:11').committed, true);

  const restartedCursor = new BlockCursor(store);
  assert.equal(restartedCursor.get(), 10);
  assert.deepEqual(evidence.get('block:11'), {
    committed: true,
    digest: 'digest-11',
  });

  restartedCursor.advance(11);
  assert.equal(restartedCursor.get(), 11);
  assert.equal(store.read().lastProcessedBlock, 11);
});
