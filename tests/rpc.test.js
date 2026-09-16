'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  RPC_TIMEOUT_MS,
  createProvider,
} = require('../src/core/rpc');

test('RPC timeout is configured', () => {
  assert.equal(typeof RPC_TIMEOUT_MS, 'number');
  assert.ok(RPC_TIMEOUT_MS > 0);
});

test('createProvider returns a provider', () => {
  const provider = createProvider();

  assert.ok(provider);
  assert.equal(typeof provider.getNetwork, 'function');
  assert.equal(typeof provider.getBlockNumber, 'function');

  provider.destroy();
});
