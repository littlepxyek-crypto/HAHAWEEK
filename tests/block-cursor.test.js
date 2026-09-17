'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { BlockCursor } = require('../src/core/block-cursor');

function createTestCursor() {
  let persisted = {
    version: 1,
    lastProcessedBlock: null,
    status: 'INITIALIZING',
    lastError: null,
    updatedAt: null,
  };

  return {
    cursor: new BlockCursor({
      loadState: () => ({ ...persisted }),
      saveState: (nextState) => {
        persisted = { ...nextState };
      },
    }),
    getPersistedState: () => ({ ...persisted }),
  };
}

test('block cursor initializes once', () => {
  const { cursor } = createTestCursor();

  assert.equal(cursor.get(), null);
  assert.equal(cursor.initialize(100), 100);
  assert.equal(cursor.get(), 100);

  assert.equal(cursor.initialize(200), 100);
});

test('block cursor advances and survives restart', () => {
  let persisted = {
    version: 1,
    lastProcessedBlock: null,
    status: 'INITIALIZING',
    lastError: null,
    updatedAt: null,
  };

  const makeCursor = () =>
    new BlockCursor({
      loadState: () => ({ ...persisted }),
      saveState: (nextState) => {
        persisted = { ...nextState };
      },
    });

  const cursor = makeCursor();

  cursor.initialize(100);
  assert.equal(cursor.advance(101), 101);
  assert.equal(cursor.advance(105), 105);

  const restarted = makeCursor();

  assert.equal(restarted.get(), 105);
});

test('block cursor rejects regression', () => {
  const { cursor } = createTestCursor();

  cursor.initialize(100);

  assert.throws(
    () => cursor.advance(99),
    /BLOCK_CURSOR_REGRESSION/
  );
});
