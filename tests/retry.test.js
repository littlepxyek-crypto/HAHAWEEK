'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  retry,
  calculateBackoff,
} = require('../src/core/retry');

test('backoff grows exponentially', () => {
  assert.equal(calculateBackoff(0, 100), 100);
  assert.equal(calculateBackoff(1, 100), 200);
  assert.equal(calculateBackoff(2, 100), 400);
});

test('retry succeeds after transient failures', async () => {
  let attempts = 0;

  const result = await retry(
    async () => {
      attempts += 1;

      if (attempts < 3) {
        throw new Error('TEMPORARY_FAILURE');
      }

      return 'OK';
    },
    {
      maxAttempts: 3,
      baseDelayMs: 0,
    }
  );

  assert.equal(result, 'OK');
  assert.equal(attempts, 3);
});

test('retry throws after max attempts', async () => {
  let attempts = 0;

  await assert.rejects(
    () =>
      retry(
        async () => {
          attempts += 1;
          throw new Error('PERMANENT_FAILURE');
        },
        {
          maxAttempts: 3,
          baseDelayMs: 0,
        }
      ),
    /PERMANENT_FAILURE/
  );

  assert.equal(attempts, 3);
});
