'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchLogRangeWithRetry, safeErrorCode } = require('../src/core/hfi-log-retry-diagnostics');

function mockProvider(sequence) {
  let calls = 0;
  return {
    get calls() { return calls; },
    async getLogs() {
      const next = sequence[calls++];
      if (next instanceof Error) throw next;
      return next;
    },
  };
}

const noSleep = async () => {};
const fixedRandom = () => 0.5;

test('diagnostic error codes use a strict safe allowlist', () => {
  assert.equal(safeErrorCode({ code: 'TIMEOUT' }), 'TIMEOUT');
  assert.equal(safeErrorCode({ code: 503 }), '503');
  assert.equal(safeErrorCode({ code: 'https://secret.example/?token=do-not-log' }), null);
  assert.equal(safeErrorCode({ code: 'token=secret-value' }), null);
  assert.equal(safeErrorCode({ code: 'PRIVATE_API_KEY_123' }), null);
  assert.equal(safeErrorCode({ code: 'unknown provider payload' }), null);
  assert.equal(safeErrorCode({ code: { toString() { throw new Error('must not be called'); } } }), null);
});

test('sensitive provider error codes are omitted from emitted diagnostics', async () => {
  const secretCode = 'https://secret.example/?token=do-not-log';
  const provider = mockProvider([
    Object.assign(new Error('request timeout'), { code: secretCode }),
    Object.assign(new Error('request timeout'), { code: secretCode }),
    Object.assign(new Error('request timeout'), { code: secretCode }),
  ]);
  const events = [];

  await assert.rejects(
    fetchLogRangeWithRetry({
      provider, filter: {}, fromBlock: 1, toBlock: 2,
      onAttempt: (event) => events.push(event), sleep: noSleep, random: fixedRandom,
    }),
    /request timeout/
  );

  assert.equal(events.length, 3);
  assert.ok(events.every((event) => event.error_code === null));
  assert.ok(events.every((event) => event.decision === 'RETRY' || event.decision === 'FAIL'));
  assert.doesNotMatch(JSON.stringify(events), /secret\.example|do-not-log|token=/);
});

test('getLogs retry diagnostics record a transient failure followed by success', async () => {
  const provider = mockProvider([
    Object.assign(new Error('request timeout https://secret.example/?token=do-not-log'), { code: 'TIMEOUT' }),
    [{ blockNumber: 123 }],
  ]);
  const events = [];

  const result = await fetchLogRangeWithRetry({
    provider, filter: { address: '0xabc' }, fromBlock: 100, toBlock: 200,
    onAttempt: (event) => events.push(event), sleep: noSleep, random: fixedRandom,
  });

  assert.deepEqual(result, [{ blockNumber: 123 }]);
  assert.equal(provider.calls, 2);
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((event) => event.decision), ['RETRY', 'RETURN']);
  assert.equal(events[0].error_category, 'TRANSIENT_RPC');
  assert.equal(events[0].error_code, 'TIMEOUT');
  assert.equal(events[1].outcome, 'SUCCESS');
  assert.ok(events.every((event) => event.from_block === 100 && event.to_block === 200));
  assert.doesNotMatch(JSON.stringify(events), /secret\.example|do-not-log|token=/);
});

test('repeated getLogs timeouts stop after the bounded third attempt', async () => {
  const provider = mockProvider([
    Object.assign(new Error('request timeout'), { code: 'TIMEOUT' }),
    Object.assign(new Error('request timeout'), { code: 'TIMEOUT' }),
    Object.assign(new Error('request timeout'), { code: 'TIMEOUT' }),
  ]);
  const events = [];

  await assert.rejects(
    fetchLogRangeWithRetry({
      provider, filter: {}, fromBlock: 10, toBlock: 20,
      onAttempt: (event) => events.push(event), sleep: noSleep, random: fixedRandom,
    }),
    /request timeout/
  );

  assert.equal(provider.calls, 3);
  assert.deepEqual(events.map((event) => event.decision), ['RETRY', 'RETRY', 'FAIL']);
  assert.ok(events.every((event) => event.error_category === 'TRANSIENT_RPC'));
});

test('explicit range-limit rejection emits split decision without retrying same range', async () => {
  const provider = mockProvider([
    new Error('query returned more than 10000 results; block range too large'),
  ]);
  const events = [];

  await assert.rejects(
    fetchLogRangeWithRetry({
      provider, filter: {}, fromBlock: 100, toBlock: 10000,
      onAttempt: (event) => events.push(event), sleep: noSleep, random: fixedRandom,
    }),
    /block range too large/
  );

  assert.equal(provider.calls, 1);
  assert.equal(events[0].error_category, 'RANGE_LIMIT');
  assert.equal(events[0].decision, 'SPLIT');
  assert.equal(events[0].retryable, false);
});

test('unknown getLogs errors fail closed without retry', async () => {
  const provider = mockProvider([new Error('invalid filter parameter')]);
  const events = [];

  await assert.rejects(
    fetchLogRangeWithRetry({
      provider, filter: {}, fromBlock: 1, toBlock: 2,
      onAttempt: (event) => events.push(event), sleep: noSleep, random: fixedRandom,
    }),
    /invalid filter parameter/
  );

  assert.equal(provider.calls, 1);
  assert.equal(events[0].error_category, 'NON_RETRYABLE');
  assert.equal(events[0].decision, 'FAIL');
});

test('range-limit diagnostic reports failure when adaptive splitting is out of bounds', async () => {
  const provider = mockProvider([
    new Error('query returned more than 10000 results; block range too large'),
  ]);
  const events = [];

  await assert.rejects(
    fetchLogRangeWithRetry({
      provider, filter: {}, fromBlock: 100, toBlock: 10000,
      onAttempt: (event) => events.push(event), sleep: noSleep, random: fixedRandom,
      canSplitRange: () => false,
    }),
    /block range too large/
  );

  assert.equal(provider.calls, 1);
  assert.equal(events[0].decision, 'FAIL');
  assert.equal(events[0].error_category, 'RANGE_LIMIT');
});
