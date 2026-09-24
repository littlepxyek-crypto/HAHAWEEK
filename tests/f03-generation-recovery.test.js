'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { assertGeneration, assertRecoveryAuthority } = require('../src/core/f03-generation-recovery');

test('F-03 accepts matching authority generation', () => {
  assert.deepEqual(assertGeneration({ expectedGeneration: 'g1', actualGeneration: 'g1' }), { status: 'MATCHED', generation: 'g1' });
});
test('F-03 rejects conflicting generation', () => {
  assert.throws(() => assertGeneration({ expectedGeneration: 'g1', actualGeneration: 'g2' }), /GENERATION_CONFLICT/);
});
test('F-03 rejects incomplete generation', () => {
  assert.throws(() => assertGeneration({ expectedGeneration: 'g1', actualGeneration: null }), /GENERATION_MISSING/);
});
test('F-03 accepts durable restart authority', () => {
  assert.deepEqual(assertRecoveryAuthority({
    persistedGeneration: 'g1', persistedCheckpoint: true, cursorGeneration: 'g1',
  }), { status: 'RECOVERABLE', generation: 'g1' });
});
test('F-03 rejects cursor generation divergence after restart', () => {
  assert.throws(() => assertRecoveryAuthority({
    persistedGeneration: 'g1', persistedCheckpoint: true, cursorGeneration: 'g2',
  }), /GENERATION_CONFLICT/);
});
test('F-03 rejects non-durable checkpoint recovery', () => {
  assert.throws(() => assertRecoveryAuthority({
    persistedGeneration: 'g1', persistedCheckpoint: false, cursorGeneration: 'g1',
  }), /CHECKPOINT_NOT_DURABLE/);
});
