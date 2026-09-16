'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { rpcCall } = require('../src/core/rpc-call');

test('rpcCall retries transient RPC failure and succeeds', async () => {
  let attempts = 0;

  const result = await rpcCall(
    async () => {
      attempts += 1;

      if (attempts < 3) {
        throw new Error('RPC_TEMPORARY_FAILURE');
      }

      return 4663;
    },
    {
      maxAttempts: 3,
      baseDelayMs: 0,
    }
  );

  assert.equal(result, 4663);
  assert.equal(attempts, 3);
});

test('rpcCall does not retry after success', async () => {
  let attempts = 0;

  const result = await rpcCall(
    async () => {
      attempts += 1;
      return 123456;
    },
    {
      maxAttempts: 3,
      baseDelayMs: 0,
    }
  );

  assert.equal(result, 123456);
  assert.equal(attempts, 1);
});

test('rpcCall preserves final RPC failure', async () => {
  let attempts = 0;

  await assert.rejects(
    () =>
      rpcCall(
        async () => {
          attempts += 1;
          throw new Error('RPC_PERMANENT_FAILURE');
        },
        {
          maxAttempts: 3,
          baseDelayMs: 0,
        }
      ),
    /RPC_PERMANENT_FAILURE/
  );

  assert.equal(attempts, 3);
});
