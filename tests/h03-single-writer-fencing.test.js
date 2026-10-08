'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createSingleWriterLease,
  LEASE_HELD,
  FENCE_REJECTED
} = require('../src/reference/v4/single-writer-lease');

test('H-03 only one writer can hold the lease', () => {
  const lease = createSingleWriterLease();
  const a = lease.acquire('writer-A');

  assert.equal(a.epoch, 1);
  assert.throws(() => lease.acquire('writer-B'), /LEASE_HELD/);

  lease.release(a);
  const b = lease.acquire('writer-B');
  assert.equal(b.epoch, 2);
});

test('H-03 stale writer is fenced after lease epoch changes', () => {
  const lease = createSingleWriterLease();
  const a = lease.acquire('writer-A');
  lease.release(a);
  const b = lease.acquire('writer-B');

  assert.throws(() => lease.assertOwner(a), error => {
    assert.equal(error.code, FENCE_REJECTED);
    return true;
  });
  assert.doesNotThrow(() => lease.assertOwner(b));
});

test('H-03 wrong owner cannot release another writer lease', () => {
  const lease = createSingleWriterLease();
  const a = lease.acquire('writer-A');

  assert.throws(
    () => lease.release({ owner: 'writer-B', epoch: a.epoch }),
    /FENCE_REJECTED/
  );
  assert.doesNotThrow(() => lease.assertOwner(a));
});

test('H-03 stale writer cannot regain authority implicitly', () => {
  const lease = createSingleWriterLease();
  const a = lease.acquire('writer-A');
  lease.release(a);
  const b = lease.acquire('writer-B');

  assert.throws(() => lease.assertOwner(a), /FENCE_REJECTED/);
  assert.deepEqual(lease.snapshot(), { owner: 'writer-B', epoch: b.epoch });
});
