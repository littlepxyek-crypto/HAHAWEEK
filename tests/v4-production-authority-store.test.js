'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createDatabase } = require('../src/core/database');
const {
  insertManifest,
  loadManifest,
  insertCheckpoint,
  loadCheckpoint,
  loadAuthoritativeCursor,
} = require('../src/core/v4-production-authority-store');
const { expectedCheckpointHash, expectedCursorHash } = require('../src/core/v4-checkpoint-authority');

function fixture() {
  const manifestHash = '0x' + 'a'.repeat(64);
  const manifest = {
    exists: true,
    hash: manifestHash,
    generation: '7',
    inventory_valid: true,
    segments_valid: true,
  };
  const checkpointInput = { generation: '7', manifest_hash: manifestHash };
  const checkpoint = {
    input: checkpointInput,
    hash: expectedCheckpointHash(checkpointInput),
  };
  const cursorInput = {
    generation: '7',
    checkpoint_hash: checkpoint.hash,
    position: '100',
  };
  const cursor = {
    input: cursorInput,
    hash: expectedCursorHash(cursorInput),
  };
  return { manifest, checkpoint, cursor };
}

test('V4 production authority store persists and verifies manifest -> checkpoint -> cursor', async () => {
  const db = await createDatabase(':memory:');
  const { manifest, checkpoint, cursor } = fixture();

  insertManifest(db, manifest);
  assert.deepEqual(loadManifest(db, manifest.hash), manifest);

  insertCheckpoint(db, checkpoint);
  assert.deepEqual(loadCheckpoint(db, checkpoint.hash), checkpoint);

  assert.equal(loadAuthoritativeCursor(db, cursor), true);
  db.close();
});

test('V4 production authority store fails closed when checkpoint manifest is missing', async () => {
  const db = await createDatabase(':memory:');
  const { checkpoint } = fixture();
  assert.throws(() => insertCheckpoint(db, checkpoint), /CHECKPOINT_MANIFEST_MISSING/);
  db.close();
});

test('V4 production authority store rejects a checkpoint bound to a mismatched manifest', async () => {
  const db = await createDatabase(':memory:');
  const { manifest, checkpoint } = fixture();
  insertManifest(db, { ...manifest, hash: '0x' + 'b'.repeat(64) });
  assert.throws(() => insertCheckpoint(db, checkpoint), /CHECKPOINT_MANIFEST_MISSING/);
  db.close();
});

test('V4 production authority store rejects a cursor bound to another checkpoint', async () => {
  const db = await createDatabase(':memory:');
  const { manifest, checkpoint, cursor } = fixture();
  insertManifest(db, manifest);
  insertCheckpoint(db, checkpoint);
  const badCursor = {
    input: { ...cursor.input, checkpoint_hash: '0x' + 'b'.repeat(64) },
    hash: expectedCursorHash({ ...cursor.input, checkpoint_hash: '0x' + 'b'.repeat(64) }),
  };
  assert.throws(() => loadAuthoritativeCursor(db, badCursor), /CURSOR_CHECKPOINT_MISSING/);
  db.close();
});
