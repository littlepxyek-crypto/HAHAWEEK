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
