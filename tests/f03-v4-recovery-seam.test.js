'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  recoverV4Cursor,
  authorizeV4CursorAdvance,
} = require('../src/core/v4-recovery-seam');

const vectors = require('../docs/golden-vectors/checkpoint-cursor-recovery.json');

function vector(id) {
  const found = vectors.vectors.find((item) => item.id === id);
  assert.ok(found, `missing vector: ${id}`);
  return found;
}

test('F-03 recovery seam allows a validated boundary', () => {
  const v = vector('recovery-valid-chain');

  assert.deepEqual(
    recoverV4Cursor({
      manifest: v.manifest,
      checkpoint: v.checkpoint,
      cursor: v.cursor,
      acquisitionPositionValid: v.acquisition_position_valid,
    }),
    {
      status: 'RECOVERY_RESUME_ALLOWED',
      position: '0',
      generation: '0',
      checkpointHash: v.checkpoint.hash,
    }
  );
});

test('F-03 recovery seam fails closed on missing checkpoint', () => {
  const v = vector('recovery-valid-chain');

  const result = recoverV4Cursor({
    manifest: v.manifest,
    checkpoint: undefined,
    cursor: v.cursor,
    acquisitionPositionValid: true,
  });

  assert.equal(result.status, 'RECOVERY_FAIL_CLOSED');
});

test('F-03 recovery seam fails closed on stale checkpoint', () => {
  const v = vector('checkpoint-manifest-hash-mismatch');

  const checkpoint = {
    input: v.input,
    hash: '0x0fb8ff402ef4562f99a946ba1383d7d5762efc30279d860e4cb9c5283dc6babe',
  };

  const cursor = {
    input: {
      generation: '0',
      checkpoint_hash: checkpoint.hash,
      position: '0',
    },
  };

  const result = recoverV4Cursor({
    manifest: v.manifest,
    checkpoint,
    cursor,
    acquisitionPositionValid: true,
  });

  assert.equal(result.status, 'RECOVERY_FAIL_CLOSED');
});

test('F-03 recovery seam fails closed when cursor is ahead', () => {
  const v = vector('cursor-ahead-of-checkpoint');

  const manifest = {
    exists: true,
    hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    generation: '7',
    inventory_valid: true,
    segments_valid: true,
  };

  const checkpoint = {
    input: {
      generation: '7',
      manifest_hash: manifest.hash,
    },
    hash: v.checkpoint.hash,
  };

  const result = recoverV4Cursor({
    manifest,
    checkpoint,
    cursor: { input: v.input },
    acquisitionPositionValid: true,
  });

  assert.equal(result.status, 'RECOVERY_FAIL_CLOSED');
});

test('F-03 recovery seam fails closed on corrupt segment', () => {
  const v = vector('recovery-fail-closed-corrupt-segment');

  const result = recoverV4Cursor({
    manifest: v.manifest,
    checkpoint: v.checkpoint,
    cursor: v.cursor,
    acquisitionPositionValid: true,
  });

  assert.equal(result.status, 'RECOVERY_FAIL_CLOSED');
});

test('F-03 recovery seam does not mutate authority inputs', () => {
  const v = vector('recovery-valid-chain');
  const snapshot = JSON.stringify({
    manifest: v.manifest,
    checkpoint: v.checkpoint,
    cursor: v.cursor,
  });

  recoverV4Cursor({
    manifest: v.manifest,
    checkpoint: v.checkpoint,
    cursor: v.cursor,
    acquisitionPositionValid: true,
  });

  assert.equal(
    JSON.stringify({
      manifest: v.manifest,
      checkpoint: v.checkpoint,
      cursor: v.cursor,
    }),
    snapshot
  );
});

test('F-03 advance authorization remains separate from persistence', () => {
  const v = vector('recovery-valid-chain');

  const result = authorizeV4CursorAdvance({
    currentCursor: '0',
    targetPosition: '42',
    manifest: v.manifest,
    checkpoint: v.checkpoint,
    cursor: v.cursor,
    acquisitionPositionValid: true,
  });

  assert.equal(result.authorized, true);
  assert.equal(result.position, '42');
});
