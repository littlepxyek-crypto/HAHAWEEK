'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveInterval } = require('../src/observability/watch');

test('watch interval defaults to two seconds', () => {
  assert.equal(resolveInterval(undefined), 2000);
});

test('watch interval accepts bounded integer values', () => {
  assert.equal(resolveInterval(1000), 1000);
  assert.equal(resolveInterval('5000'), 5000);
  assert.equal(resolveInterval(60000), 60000);
});

test('watch interval rejects unsafe or excessive polling values', () => {
  assert.throws(() => resolveInterval(999), /OBSERVE_INTERVAL_OUT_OF_RANGE/);
  assert.throws(() => resolveInterval(60001), /OBSERVE_INTERVAL_OUT_OF_RANGE/);
  assert.throws(() => resolveInterval('not-a-number'), /OBSERVE_INTERVAL_OUT_OF_RANGE/);
});
