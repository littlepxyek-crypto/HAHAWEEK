'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vectors = require('../docs/golden-vectors/checkpoint-cursor-recovery.json');

function recoverCursor(v) {
  if (!v || !v.manifest || !v.checkpoint || !v.cursor) {
    return { status: 'RECOVERY_FAIL_CLOSED' };
  }
  if (!v.manifest.exists || !v.manifest.inventory_valid || !v.manifest.segments_valid) {
    return { status: 'RECOVERY_FAIL_CLOSED' };
  }
  if (v.checkpoint.input.manifest_hash !== v.manifest.hash) {
    return { status: 'RECOVERY_FAIL_CLOSED' };
  }
  if (v.checkpoint.input.generation !== v.manifest.generation) {
    return { status: 'RECOVERY_FAIL_CLOSED' };
  }
  if (v.cursor.input.checkpoint_hash !== v.checkpoint.hash) {
    return { status: 'RECOVERY_FAIL_CLOSED' };
  }
  if (BigInt(v.cursor.input.generation) > BigInt(v.checkpoint.input.generation)) {
    return { status: 'RECOVERY_FAIL_CLOSED' };
  }
  if (!v.acquisition_position_valid) {
    return { status: 'RECOVERY_FAIL_CLOSED' };
  }
  return {
    status: 'RECOVERY_RESUME_ALLOWED',
    position: v.cursor.input.position,
    generation: v.cursor.input.generation
  };
}

test('F-03 missing checkpoint fails closed', () => {
  const vector = vectors.vectors.find(v => v.id === 'recovery-valid-chain');
  assert.ok(vector);
  const missingCheckpoint = { ...vector, checkpoint: undefined };
  assert.equal(recoverCursor(missingCheckpoint).status, 'RECOVERY_FAIL_CLOSED');
});

test('F-03 stale checkpoint fails closed', () => {
  const vector = vectors.vectors.find(v => v.id === 'checkpoint-manifest-hash-mismatch');
  assert.ok(vector);
  const recovery = {
    ...vector,
    checkpoint: {
      input: vector.input,
      hash: '0x0fb8ff402ef4562f99a946ba1383d7d5762efc30279d860e4cb9c5283dc6babe'
    },
    cursor: {
      input: {
        generation: vector.input.generation,
        checkpoint_hash: '0x0fb8ff402ef4562f99a946ba1383d7d5762efc30279d860e4cb9c5283dc6babe',
        position: '0'
      }
    },
    acquisition_position_valid: true
  };
  assert.equal(recoverCursor(recovery).status, 'RECOVERY_FAIL_CLOSED');
});

test('F-03 malformed or inconsistent cursor fails closed', () => {
  const vector = vectors.vectors.find(v => v.id === 'cursor-ahead-of-checkpoint');
  assert.ok(vector);
  const recovery = {
    manifest: {
      exists: true,
      hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      generation: '7',
      inventory_valid: true,
      segments_valid: true
    },
    checkpoint: {
      input: {
        generation: '7',
        manifest_hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      },
      hash: vector.checkpoint.hash
    },
    cursor: { input: vector.input },
    acquisition_position_valid: true
  };
  assert.equal(recoverCursor(recovery).status, 'RECOVERY_FAIL_CLOSED');
});

test('F-03 corrupt segment fails closed', () => {
  const vector = vectors.vectors.find(v => v.id === 'recovery-fail-closed-corrupt-segment');
  assert.ok(vector);
  assert.equal(recoverCursor(vector).status, 'RECOVERY_FAIL_CLOSED');
});

test('F-03 valid checkpoint permits recovery only at validated boundary', () => {
  const vector = vectors.vectors.find(v => v.id === 'recovery-valid-chain');
  assert.ok(vector);
  const result = recoverCursor(vector);
  assert.equal(result.status, 'RECOVERY_RESUME_ALLOWED');
  assert.equal(result.position, vector.cursor.input.position);
  assert.equal(result.generation, vector.cursor.input.generation);
});
