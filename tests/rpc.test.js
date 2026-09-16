'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  RPC_TIMEOUT_MS,
  createRpcRequest,
  createProvider,
} = require('../src/core/rpc');

test('RPC timeout is configured', () => {
  assert.equal(typeof RPC_TIMEOUT_MS, 'number');
  assert.ok(RPC_TIMEOUT_MS > 0);
});

test('createRpcRequest uses configured RPC URL', () => {
  const request = createRpcRequest();

  assert.equal(
    request.url,
    process.env.RPC_URL ||
      'https://rpc.mainnet.chain.robinhood.com'
  );
});

test('createRpcRequest applies configured timeout', () => {
  const request = createRpcRequest();

  assert.equal(request.timeout, RPC_TIMEOUT_MS);
});

test('createProvider returns a provider', () => {
  const provider = createProvider();

  assert.ok(provider);
  assert.equal(typeof provider.getNetwork, 'function');
  assert.equal(typeof provider.getBlockNumber, 'function');

  provider.destroy();
});
