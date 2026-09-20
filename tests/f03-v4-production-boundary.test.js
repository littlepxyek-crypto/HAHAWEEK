'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertCheckpointAuthority,
  assertCursorAuthority,
  assertRecoveryAuthority,
  authorizeCursorAdvance,
} = require('../src/core/v4-checkpoint-authority');

const HASH = '0x' + 'a'.repeat(64);
const CHECKPOINT_HASH = '0x' + 'b'.repeat(64);

function validFixture() {
  return {
    manifest: {
      exists: true,
      hash: HASH,
      generation: '7',
      inventory_valid: true,
      segments_valid: true,
    },
    checkpoint: {
      input: {
        generation: '7',
        manifest_hash: HASH,
      },
      hash: CHECKPOINT_HASH,
    },
    cursor: {
      input: {
        generation: '6',
        checkpoint_hash: CHECKPOINT_HASH,
        position: '100',
      },
    },
  };
}

test('V4 production integration boundary accepts valid authority chain', () => {
  const fixture = validFixture();

  assert.equal(
    assertRecoveryAuthority({
      ...fixture,
      acquisitionPositionValid: true,
    }),
    true
  );

  assert.deepEqual(
    authorizeCursorAdvance({
      ...fixture,
      currentCursor: 100,
      targetPosition: 101,
      acquisitionPositionValid: true,
    }),
    {
      authorized: true,
      position: '101',
      checkpointHash: CHECKPOINT_HASH,
      generation: '6',
    }
  );
});

test('V4 production integration boundary fails closed on authority mismatch', () => {
  const fixture = validFixture();
  fixture.manifest.hash = '0x' + 'c'.repeat(64);

  assert.throws(
    () => assertCheckpointAuthority(fixture.checkpoint, fixture.manifest),
    /CHECKPOINT_AUTHORITY_INVALID/
  );

  assert.throws(
    () => authorizeCursorAdvance({
      ...fixture,
      currentCursor: 100,
      targetPosition: 101,
      acquisitionPositionValid: true,
    }),
    /CHECKPOINT_AUTHORITY_INVALID/
  );
});

test('V4 production integration boundary rejects cursor regression', () => {
  const fixture = validFixture();

  assert.throws(
    () => authorizeCursorAdvance({
      ...fixture,
      currentCursor: 100,
      targetPosition: 99,
      acquisitionPositionValid: true,
    }),
    /BLOCK_CURSOR_REGRESSION/
  );
});

test('V4 production integration boundary rejects invalid acquisition position', () => {
  const fixture = validFixture();

  assert.throws(
    () => assertRecoveryAuthority({
      ...fixture,
      acquisitionPositionValid: false,
    }),
    /RECOVERY_AUTHORITY_INVALID/
  );
});

test('V4 production integration boundary rejects cursor ahead of checkpoint generation', () => {
  const fixture = validFixture();
  fixture.cursor.input.generation = '8';

  assert.throws(
    () => assertCursorAuthority(fixture.cursor, fixture.checkpoint),
    /CURSOR_AUTHORITY_INVALID/
  );
});
