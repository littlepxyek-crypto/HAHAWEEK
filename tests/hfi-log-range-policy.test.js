'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isRetryableRpcError,
  isRangeLimitError,
  shouldSplitLogRange,
} = require('../src/core/hfi-log-range-policy');

test('explicit provider block-range rejection may trigger adaptive splitting', () => {
  const error = new Error('query returned more than 10000 results; block range too large');
  assert.equal(isRangeLimitError(error), true);
  assert.equal(shouldSplitLogRange(error), true);
});

test('transient RPC timeout is retryable but must not trigger range splitting', () => {
  const error = new Error('request timeout');
  assert.equal(isRetryableRpcError(error), true);
  assert.equal(isRangeLimitError(error), false);
  assert.equal(shouldSplitLogRange(error), false);
});

test('rate limits are retryable but must not trigger range splitting', () => {
  const error = new Error('HTTP 429 too many requests');
  assert.equal(isRetryableRpcError(error), true);
  assert.equal(shouldSplitLogRange(error), false);
});

test('unknown errors fail closed without range splitting', () => {
  const error = new Error('invalid filter parameter');
  assert.equal(isRetryableRpcError(error), false);
  assert.equal(shouldSplitLogRange(error), false);
});
