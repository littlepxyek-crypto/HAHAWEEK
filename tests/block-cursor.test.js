'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const { BlockCursor } = require('../src/core/block-cursor');
const { STATE_FILE } = require('../src/core/state');

test('block cursor initializes once', () => {
  fs.rmSync(STATE_FILE, { force: true });

  const cursor = new BlockCursor();

  assert.equal(cursor.get(), null);
  assert.equal(cursor.initialize(100), 100);
  assert.equal(cursor.get(), 100);

  assert.equal(cursor.initialize(200), 100);

  fs.rmSync(STATE_FILE, { force: true });
});

test('block cursor advances and survives restart', () => {
  fs.rmSync(STATE_FILE, { force: true });

  const cursor = new BlockCursor();

  cursor.initialize(100);
  assert.equal(cursor.advance(101), 101);
  assert.equal(cursor.advance(105), 105);

  const restarted = new BlockCursor();

  assert.equal(restarted.get(), 105);

  fs.rmSync(STATE_FILE, { force: true });
});

test('block cursor rejects regression', () => {
  fs.rmSync(STATE_FILE, { force: true });

  const cursor = new BlockCursor();

  cursor.initialize(100);

  assert.throws(
    () => cursor.advance(99),
    /BLOCK_CURSOR_REGRESSION/
  );

  fs.rmSync(STATE_FILE, { force: true });
});
