'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createWriterFence,
  WriterFenceError,
} = require('../src/core/single-writer-fence');

function tempFile() {
  return path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-h03-')),
    'writer-fence.json'
  );
}

test('H-03: one writer acquires, renews, and releases authority', () => {
  const filename = tempFile();
  const writer = createWriterFence({ filename, ownerId: 'writer-a', leaseMs: 1000 });

  const acquired = writer.acquire();
  assert.equal(acquired.ownerId, 'writer-a');
  assert.equal(acquired.fence, 1);
  assert.equal(writer.assertOwned(), true);

  const renewed = writer.renew();
  assert.equal(renewed.fence, 1);
  assert.equal(writer.assertOwned(), true);

  assert.equal(writer.release(), true);
  assert.throws(() => writer.assertOwned(), error =>
    error instanceof WriterFenceError &&
    error.code === 'STALE_WRITER_FENCE'
  );
});


test('H-03: watchdog performs an immediate renewal before readiness', async () => {
  const filename = tempFile();
  const writer = createWriterFence({
    filename,
    ownerId: 'writer-watchdog-immediate',
    leaseMs: 500,
  });

  const acquired = writer.acquire();
  await writer.startWatchdog({ intervalMs: 100 });

  const current = writer.getState();
  assert.equal(current.ownerId, acquired.ownerId);
  assert.equal(current.fence, acquired.fence);
  assert.ok(current.expiresAt > acquired.expiresAt);

  const diagnostics = writer.getWatchdogDiagnostics();
  assert.ok(diagnostics);
  assert.equal(diagnostics.leaseMs, 500);
  assert.equal(diagnostics.intervalMs, 100);
  assert.ok(diagnostics.startedAt <= diagnostics.readyAt);
  assert.equal(diagnostics.renewalCount, 1);
  assert.ok(diagnostics.lastRenewedAt >= diagnostics.lastRenewStartedAt);
  assert.ok(diagnostics.lastRenewDurationMs >= 0);

  await writer.stopWatchdog();
  assert.equal(writer.release(), true);
});


test('H-03: watchdog renews fence while main event loop is blocked', async () => {
  const filename = tempFile();
  const writer = createWriterFence({
    filename,
    ownerId: 'writer-watchdog',
    leaseMs: 200,
  });

  writer.acquire();
  await writer.startWatchdog({ intervalMs: 50 });

  const waitBuffer = new SharedArrayBuffer(4);
  const waitView = new Int32Array(waitBuffer);
  Atomics.wait(waitView, 0, 0, 600);

  assert.equal(writer.assertOwned(), true);

  // Worker messages queued while the main thread was blocked are delivered
  // only after the event loop gets a turn.
  await new Promise(resolve => setImmediate(resolve));

  const diagnostics = writer.getWatchdogDiagnostics();
  assert.ok(diagnostics);
  assert.ok(diagnostics.renewalCount >= 2);
  assert.ok(diagnostics.lastRenewedAt >= diagnostics.lastRenewStartedAt);
  assert.ok(diagnostics.lastRenewDurationMs >= 0);

  await writer.stopWatchdog();
  assert.equal(writer.release(), true);
});


test('H-03: watchdog renewal failure propagates fail-closed with concrete cause', async () => {
  const filename = tempFile();
  const writer = createWriterFence({
    filename,
    ownerId: 'writer-watchdog-failure',
    leaseMs: 500,
  });

  writer.acquire();
  await writer.startWatchdog({ intervalMs: 25 });

  const lockFile = filename + '.lock';
  fs.writeFileSync(lockFile, 'test contention', 'utf8');

  await new Promise(resolve => setTimeout(resolve, 100));

  assert.throws(() => writer.assertOwned(), error =>
    error instanceof WriterFenceError &&
    error.code === 'WRITER_FENCE_WATCHDOG_RENEWAL_FAILED' &&
    error.causeCode === 'WRITER_FENCE_BUSY'
  );

  const watchdogFailure = writer.getWatchdogFailure();
  assert.equal(watchdogFailure.code, 'WRITER_FENCE_WATCHDOG_RENEWAL_FAILED');
  assert.equal(watchdogFailure.causeCode, 'WRITER_FENCE_BUSY');
  assert.ok(watchdogFailure.diagnostics);
  assert.equal(watchdogFailure.diagnostics.lastRenewFailureCode, 'WRITER_FENCE_BUSY');
  assert.ok(watchdogFailure.diagnostics.lastRenewFailureAt >= watchdogFailure.diagnostics.lastRenewStartedAt);
  assert.ok(watchdogFailure.diagnostics.lastRenewDurationMs >= 0);
  assert.ok(watchdogFailure.diagnostics.lastRenewFailureDelayMs >= 0);

  fs.unlinkSync(lockFile);
  await writer.stopWatchdog();
  assert.equal(writer.release(), true);
});

test('H-03: active writer blocks another writer', () => {
  const filename = tempFile();
  const a = createWriterFence({ filename, ownerId: 'writer-a', leaseMs: 1000 });
  const b = createWriterFence({ filename, ownerId: 'writer-b', leaseMs: 1000 });

  a.acquire();

  assert.throws(() => b.acquire(), error =>
    error instanceof WriterFenceError &&
    error.code === 'WRITER_FENCE_HELD'
  );
});

test('H-03: expired writer is fenced and newer writer gets higher fence', () => {
  const filename = tempFile();
  let now = 1000;
  const a = createWriterFence({
    filename,
    ownerId: 'writer-a',
    leaseMs: 100,
    now: () => now,
  });
  const b = createWriterFence({
    filename,
    ownerId: 'writer-b',
    leaseMs: 100,
    now: () => now,
  });

  const first = a.acquire();
  assert.equal(first.fence, 1);

  now = 1100;

  assert.throws(() => a.assertOwned(), error =>
    error instanceof WriterFenceError &&
    error.code === 'WRITER_FENCE_EXPIRED'
  );

  const second = b.acquire();
  assert.equal(second.fence, 2);
  assert.equal(b.assertOwned(), true);

  assert.throws(() => a.assertOwned(), error =>
    error instanceof WriterFenceError &&
    error.code === 'STALE_WRITER_FENCE'
  );
});

test('H-03: malformed and invalid state fail closed', () => {
  const filename = tempFile();
  fs.writeFileSync(filename, '{broken', 'utf8');

  const writer = createWriterFence({ filename, ownerId: 'writer-a' });
  assert.throws(() => writer.acquire(), error =>
    error instanceof WriterFenceError &&
    error.code === 'MALFORMED_WRITER_FENCE_STATE'
  );

  fs.writeFileSync(filename, JSON.stringify({
    version: 1,
    ownerId: 'writer-a',
    fence: 'not-an-integer',
    expiresAt: 9999,
  }), 'utf8');

  assert.throws(() => writer.acquire(), error =>
    error instanceof WriterFenceError &&
    error.code === 'INVALID_WRITER_FENCE_STATE'
  );
});

test('H-03: stale fence cannot pass the shared legacy write barrier', () => {
  const filename = tempFile();
  const barrierState = path.join(path.dirname(filename), 'legacy-write-state.json');
  const a = createWriterFence({ filename, ownerId: 'writer-a', leaseMs: 100 });
  const b = createWriterFence({ filename, ownerId: 'writer-b', leaseMs: 100 });

  a.acquire();
  const { createLegacyWriteBarrier } = require('../src/core/legacy-write-freeze');
  const barrier = createLegacyWriteBarrier({
    filename: barrierState,
    writerFence: a,
  });

  assert.equal(barrier.assertWritable(), true);

  b.acquire = b.acquire.bind(b);
  const state = JSON.parse(fs.readFileSync(filename, 'utf8'));
  fs.writeFileSync(filename, JSON.stringify({
    ...state,
    ownerId: 'writer-b',
    fence: state.fence + 1,
    expiresAt: Date.now() + 1000,
  }), 'utf8');

  assert.throws(() => barrier.assertWritable(), error =>
    error instanceof WriterFenceError &&
    error.code === 'STALE_WRITER_FENCE'
  );
});
