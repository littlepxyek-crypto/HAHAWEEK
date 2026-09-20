'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const vectors =
  require('../docs/golden-vectors/checkpoint-cursor-recovery.json');

const byId = new Map(vectors.vectors.map(vector => [vector.id, vector]));

test('F-03 adversarial matrix is explicitly covered by frozen vectors', () => {
  const matrix = [
    ['checkpoint valid', 'checkpoint-genesis-valid', 'CHECKPOINT_VALID'],
    ['checkpoint missing', 'checkpoint-manifest-missing', 'CHECKPOINT_INVALID'],
    ['checkpoint hash mismatch', 'checkpoint-manifest-hash-mismatch', 'CHECKPOINT_INVALID'],
    ['checkpoint noncanonical generation', 'checkpoint-generation-noncanonical', 'CHECKPOINT_INVALID'],
    ['checkpoint inventory invalid', 'checkpoint-inventory-invalid', 'CHECKPOINT_INVALID'],
    ['cursor valid', 'cursor-genesis-valid', 'CURSOR_VALID'],
    ['cursor checkpoint mismatch', 'cursor-checkpoint-mismatch', 'CURSOR_INVALID'],
    ['cursor ahead of checkpoint', 'cursor-ahead-of-checkpoint', 'CURSOR_INVALID'],
    ['recovery valid chain', 'recovery-valid-chain', 'RECOVERY_RESUME_ALLOWED'],
    ['recovery corrupt segment', 'recovery-fail-closed-corrupt-segment', 'RECOVERY_FAIL_CLOSED'],
  ];

  for (const [name, id, expected] of matrix) {
    const vector = byId.get(id);

    assert.ok(vector, `missing F-03 vector: ${name}`);
    assert.equal(vector.expected, expected, name);
  }
});

test('F-03 matrix remains fail-closed for every negative checkpoint/cursor/recovery vector', () => {
  const negativeIds = [
    'checkpoint-generation-noncanonical',
    'checkpoint-manifest-hash-mismatch',
    'checkpoint-manifest-missing',
    'checkpoint-inventory-invalid',
    'cursor-checkpoint-mismatch',
    'cursor-ahead-of-checkpoint',
    'recovery-fail-closed-corrupt-segment',
  ];

  for (const id of negativeIds) {
    const vector = byId.get(id);

    assert.ok(vector, `missing negative vector: ${id}`);
    assert.notEqual(vector.expected, 'CHECKPOINT_VALID', id);
    assert.notEqual(vector.expected, 'CURSOR_VALID', id);
    assert.notEqual(vector.expected, 'RECOVERY_RESUME_ALLOWED', id);
  }
});
