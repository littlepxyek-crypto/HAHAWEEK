'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { assertRecoveryAuthority } = require('../src/core/f03-generation-recovery');

test('F-03 recovery accepts persisted authority after restart', () => {
  assert.deepEqual(
    assertRecoveryAuthority({
      persistedGeneration: 'g1',
      persistedCheckpoint: true,
      cursorGeneration: 'g1',
    }),
    { status: 'RECOVERABLE', generation: 'g1' }
  );
});

test('F-03 recovery rejects conflicting generation after restart', () => {
  assert.throws(
    () => assertRecoveryAuthority({
      persistedGeneration: 'g1',
      persistedCheckpoint: true,
      cursorGeneration: 'g2',
    }),
    /GENERATION_CONFLICT/
  );
});

test('F-03 recovery rejects non-durable checkpoint', () => {
  assert.throws(
    () => assertRecoveryAuthority({
      persistedGeneration: 'g1',
      persistedCheckpoint: false,
      cursorGeneration: 'g1',
    }),
    /CHECKPOINT_NOT_DURABLE/
  );
});

test('F-03 recovery rejects incomplete persisted authority', () => {
  assert.throws(
    () => assertRecoveryAuthority({
      persistedGeneration: 'g1',
      persistedCheckpoint: true,
    }),
    /AUTHORITY_INCOMPLETE/
  );
});
