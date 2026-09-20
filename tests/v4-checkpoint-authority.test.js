'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertCheckpointAuthority,
  assertCursorAuthority,
  assertRecoveryAuthority,
  authorizeCursorAdvance,
} = require('../src/core/v4-checkpoint-authority');

const vectors = require('../docs/golden-vectors/checkpoint-cursor-recovery.json');

function vector(id) {
  const found = vectors.vectors.find((item) => item.id === id);
  assert.ok(found, `missing vector: ${id}`);
  return found;
}

test('V4 authority accepts the valid checkpoint chain', () => {
  const v = vector('recovery-valid-chain');

  assert.equal(
    assertCheckpointAuthority(v.checkpoint, v.manifest),
    true
  );
});

test('V4 authority rejects a missing manifest', () => {
  const v = vector('checkpoint-manifest-missing');

  assert.throws(
    () => assertCheckpointAuthority(v, v.manifest),
    /CHECKPOINT_AUTHORITY_INVALID/
  );
});

test('V4 authority rejects a manifest hash mismatch', () => {
  const v = vector('checkpoint-manifest-hash-mismatch');

  assert.throws(
    () => assertCheckpointAuthority(v, v.manifest),
    /CHECKPOINT_AUTHORITY_INVALID/
  );
});

test('V4 authority rejects a cursor ahead of its checkpoint generation', () => {
  const v = vector('cursor-ahead-of-checkpoint');

  assert.throws(
    () => assertCursorAuthority(v, v.checkpoint),
    /CURSOR_AUTHORITY_INVALID/
  );
});

test('V4 authority rejects a cursor checkpoint hash mismatch', () => {
  const v = vector('cursor-checkpoint-mismatch');

  assert.throws(
    () => assertCursorAuthority(v, v.checkpoint),
    /CURSOR_AUTHORITY_INVALID/
  );
});

test('V4 recovery authority fails closed on corrupt segments', () => {
  const v = vector('recovery-fail-closed-corrupt-segment');

  assert.throws(
    () => assertRecoveryAuthority({
      manifest: v.manifest,
      checkpoint: v.checkpoint,
      cursor: v.cursor,
      acquisitionPositionValid: v.acquisition_position_valid,
    }),
    /CHECKPOINT_AUTHORITY_INVALID|RECOVERY_AUTHORITY_INVALID/
  );
});

test('cursor advancement is authorized only after authority validation', () => {
  const v = vector('recovery-valid-chain');

  const result = authorizeCursorAdvance({
    currentCursor: '0',
    targetPosition: '42',
    manifest: v.manifest,
    checkpoint: v.checkpoint,
    cursor: v.cursor,
    acquisitionPositionValid: true,
  });

  assert.deepEqual(result, {
    authorized: true,
    position: '42',
    checkpointHash: v.checkpoint.hash,
    generation: v.cursor.input.generation,
  });
});

test('cursor advancement fails closed when authority is invalid', () => {
  const v = vector('recovery-valid-chain');
  const invalidCursor = {
    input: {
      ...v.cursor.input,
      checkpoint_hash: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    },
  };

  assert.throws(
    () => authorizeCursorAdvance({
      currentCursor: '0',
      targetPosition: '42',
      manifest: v.manifest,
      checkpoint: v.checkpoint,
      cursor: invalidCursor,
      acquisitionPositionValid: true,
    }),
    /CURSOR_AUTHORITY_INVALID/
  );
});

test('cursor advancement cannot regress the current position', () => {
  const v = vector('recovery-valid-chain');

  assert.throws(
    () => authorizeCursorAdvance({
      currentCursor: '10',
      targetPosition: '9',
      manifest: v.manifest,
      checkpoint: v.checkpoint,
      cursor: v.cursor,
      acquisitionPositionValid: true,
    }),
    /BLOCK_CURSOR_REGRESSION/
  );
});
