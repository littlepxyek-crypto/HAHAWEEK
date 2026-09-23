'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

class SingleWriterLease {
  constructor() {
    this.owner = null;
    this.epoch = 0;
  }

  acquire(owner) {
    if (!owner) throw new Error('OWNER_REQUIRED');
    if (this.owner !== null) throw Object.assign(new Error('LEASE_HELD'), { code: 'LEASE_HELD' });
    this.owner = owner;
    this.epoch += 1;
    return { owner, epoch: this.epoch };
  }

  assertOwner(token) {
    if (!token || token.owner !== this.owner || token.epoch !== this.epoch) {
      throw Object.assign(new Error('FENCE_REJECTED'), { code: 'FENCE_REJECTED' });
    }
  }

  release(token) {
    this.assertOwner(token);
    this.owner = null;
  }
}

test('only one writer can hold the lease', () => {
  const lease = new SingleWriterLease();
  const a = lease.acquire('writer-A');

  assert.equal(a.epoch, 1);
  assert.throws(() => lease.acquire('writer-B'), /LEASE_HELD/);

  lease.assertOwner(a);
  lease.release(a);

  const b = lease.acquire('writer-B');
  assert.equal(b.epoch, 2);
});

test('stale writer is fenced after a new lease epoch', () => {
  const lease = new SingleWriterLease();
  const a = lease.acquire('writer-A');
  lease.release(a);

  const b = lease.acquire('writer-B');

  assert.throws(() => lease.assertOwner(a), error => {
    assert.equal(error.code, 'FENCE_REJECTED');
    return true;
  });

  lease.assertOwner(b);
});

test('wrong owner cannot release another writer lease', () => {
  const lease = new SingleWriterLease();
  const a = lease.acquire('writer-A');

  assert.throws(() => lease.release({ owner: 'writer-B', epoch: a.epoch }), /FENCE_REJECTED/);
  lease.assertOwner(a);
});

test('lease has no implicit recovery by a stale writer', () => {
  const lease = new SingleWriterLease();
  const a = lease.acquire('writer-A');
  lease.release(a);
  const b = lease.acquire('writer-B');

  assert.throws(() => lease.assertOwner(a), /FENCE_REJECTED/);
  assert.equal(lease.owner, 'writer-B');
  assert.equal(lease.epoch, b.epoch);
});
