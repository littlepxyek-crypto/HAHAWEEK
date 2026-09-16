'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { runHealth } = require('../src/health');

test('runHealth returns RPC status and reports HEALTH OK', async () => {
  const calls = [];

  const fakeStatus = {
    rpcUrl: 'https://example.invalid/rpc',
    expectedChainId: 4663,
    actualChainId: 4663,
    blockNumber: 123456,
  };

  const result = await runHealth(
    async () => fakeStatus,
    (message) => calls.push(message)
  );

  assert.deepEqual(result, fakeStatus);

  assert.deepEqual(calls, [
    'RPC: https://example.invalid/rpc',
    'Expected Chain ID: 4663',
    'Actual Chain ID: 4663',
    'Current Block: 123456',
    'HEALTH: OK',
  ]);
});

test('runHealth propagates health-check failure', async () => {
  await assert.rejects(
    () => runHealth(async () => {
      throw new Error('RPC_UNAVAILABLE');
    }),
    {
      message: 'RPC_UNAVAILABLE',
    }
  );
});

test('runHealth does not require a live RPC for unit testing', async () => {
  let called = false;

  await runHealth(
    async () => {
      called = true;

      return {
        rpcUrl: 'mock://rpc',
        expectedChainId: 4663,
        actualChainId: 4663,
        blockNumber: 1,
      };
    },
    () => {}
  );

  assert.equal(called, true);
});
