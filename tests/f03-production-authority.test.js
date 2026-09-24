'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { assertCheckpointBeforeCursor } = require('../src/core/f03-production-authority');

test('F-03 rejects cursor authority before checkpoint commitment', () => {
  assert.throws(
    () => assertCheckpointBeforeCursor({
      checkpointCommitted: false,
      cursorAdvanced: true,
    }),
    /CHECKPOINT_NOT_COMMITTED/
  );
});

test('F-03 accepts authority only after checkpoint commitment', () => {
  assert.deepEqual(
    assertCheckpointBeforeCursor({
      checkpointCommitted: true,
    }),
    {
      status: 'AUTHORIZED',
      checkpointCommitted: true,
      cursorAdvanced: true,
    }
  );
});

test('F-03 is fail-closed for incomplete authority evidence', () => {
  assert.throws(
    () => assertCheckpointBeforeCursor({
      checkpointCommitted: false,
    }),
    /CURSOR_NOT_ADVANCED/
  );
});
