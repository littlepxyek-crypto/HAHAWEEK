'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { getSafeHead } = require('../src/core/confirmation');

test('safe head respects confirmation depth', () => {
  assert.equal(getSafeHead(1000, 3), 997);
});

test('zero confirmations allows current head', () => {
  assert.equal(getSafeHead(1000, 0), 1000);
});

test('safe head never becomes negative', () => {
  assert.equal(getSafeHead(2, 3), 0);
});

test('invalid head block is rejected', () => {
  assert.throws(
    () => getSafeHead(-1, 3),
    /INVALID_HEAD_BLOCK/
  );
});

test('invalid confirmations are rejected', () => {
  assert.throws(
    () => getSafeHead(1000, -1),
    /INVALID_CONFIRMATIONS/
  );
});
