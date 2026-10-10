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
  assert.equal(isRangeLimitError(error), false);
  assert.equal(shouldSplitLogRange(error), false);
});

test('transient errors remain retryable when their message also mentions a block range', () => {
  for (const message of [
    'request timeout while querying block range 100-200',
    'HTTP 429 too many requests for block range 100-200',
    'gateway timeout: query range 100-200',
  ]) {
    const error = new Error(message);
    assert.equal(isRetryableRpcError(error), true, message);
    assert.equal(isRangeLimitError(error), false, message);
    assert.equal(shouldSplitLogRange(error), false, message);
  }
});

test('unknown errors fail closed without range splitting', () => {
  const error = new Error('invalid filter parameter');
  assert.equal(isRetryableRpcError(error), false);
  assert.equal(isRangeLimitError(error), false);
  assert.equal(shouldSplitLogRange(error), false);
});
