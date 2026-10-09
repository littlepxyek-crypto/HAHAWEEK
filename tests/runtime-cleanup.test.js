'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanupResources } = require('../src/core/runtime-cleanup');
const { createEngine } = require('../src');

test('cleanup attempts every action and preserves cleanup failures', async () => {
  const calls = [];
  const reported = [];

  const failures = await cleanupResources([
    ['database.close', async () => { calls.push('database'); throw new Error('DB_CLOSE_FAILED'); }],
    ['writerFence.release', async () => { calls.push('fence'); }],
    ['provider.destroy', async () => { calls.push('provider'); throw new Error('PROVIDER_DESTROY_FAILED'); }],
  ], (label, error) => reported.push([label, error.message]));

  assert.deepEqual(calls, ['database', 'fence', 'provider']);
  assert.deepEqual(failures.map(item => [item.label, item.error.message]), [
    ['database.close', 'DB_CLOSE_FAILED'],
    ['provider.destroy', 'PROVIDER_DESTROY_FAILED'],
  ]);
  assert.deepEqual(reported, [
    ['database.close', 'DB_CLOSE_FAILED'],
    ['provider.destroy', 'PROVIDER_DESTROY_FAILED'],
  ]);
});

test('cleanup succeeds with no failures', async () => {
  const calls = [];
  const failures = await cleanupResources([
    ['first', () => calls.push('first')],
    ['second', async () => calls.push('second')],
  ]);

  assert.deepEqual(calls, ['first', 'second']);
  assert.deepEqual(failures, []);
});

test('a failing error reporter does not interrupt cleanup', async () => {
  const calls = [];
  const failures = await cleanupResources([
    ['first', () => { calls.push('first'); throw new Error('CLEANUP_FAILED'); }],
    ['second', () => calls.push('second')],
  ], () => { throw new Error('REPORTER_FAILED'); });

  assert.deepEqual(calls, ['first', 'second']);
  assert.equal(failures.length, 1);
});


test('initialization failure during writer-fence acquisition cleans all constructed resources and preserves the primary error', async () => {
  const calls = [];
  const primaryError = new Error('WRITER_FENCE_HELD');
  const provider = {
    destroy: async () => {
      calls.push('provider.destroy');
      throw new Error('PROVIDER_DESTROY_FAILED');
    },
  };
  const writerFence = {
    acquire: () => {
      calls.push('writerFence.acquire');
      throw primaryError;
    },
    stopWatchdog: async () => {
      calls.push('writerFence.stopWatchdog');
      throw new Error('WATCHDOG_STOP_FAILED');
    },
    release: () => {
      calls.push('writerFence.release');
      throw new Error('FENCE_RELEASE_FAILED');
    },
  };

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    await assert.rejects(
      createEngine({
        providerFactory: () => provider,
        writerFenceFactory: () => writerFence,
      }),
      error => error === primaryError
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.deepEqual(calls, [
    'writerFence.acquire',
    'writerFence.stopWatchdog',
    'writerFence.release',
    'provider.destroy',
  ]);
});
