'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vectors = require('../docs/golden-vectors/checkpoint-cursor-recovery.json');

function recoverCursor(v) {
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
  const vector = vectors.vectors.find(v => v.id === 'recovery-fail-closed-missing-checkpoint');
  if (!vector) return assert.fail('missing golden vector');
  assert.equal(recoverCursor(vector).status, 'RECOVERY_FAIL_CLOSED');
});

test('F-03 stale checkpoint fails closed', () => {
  const vector = vectors.vectors.find(v => v.id === 'recovery-fail-closed-stale-checkpoint');
  if (!vector) return assert.fail('missing golden vector');
  assert.equal(recoverCursor(vector).status, 'RECOVERY_FAIL_CLOSED');
});

test('F-03 malformed or inconsistent cursor fails closed', () => {
  const vector = vectors.vectors.find(v => v.id === 'cursor-ahead-of-checkpoint');
  if (!vector) return assert.fail('missing golden vector');
  assert.equal(recoverCursor(vector).status, 'RECOVERY_FAIL_CLOSED');
});

test('F-03 corrupt segment fails closed', () => {
  const vector = vectors.vectors.find(v => v.id === 'recovery-fail-closed-corrupt-segment');
  if (!vector) return assert.fail('missing golden vector');
  assert.equal(recoverCursor(vector).status, 'RECOVERY_FAIL_CLOSED');
});

test('F-03 valid checkpoint permits recovery only at validated boundary', () => {
  const vector = vectors.vectors.find(v => v.id === 'recovery-valid-genesis');
  if (!vector) return assert.fail('missing golden vector');
  const result = recoverCursor(vector);
  assert.equal(result.status, 'RECOVERY_RESUME_ALLOWED');
  assert.equal(result.position, vector.cursor.input.position);
  assert.equal(result.generation, vector.cursor.input.generation);
});
