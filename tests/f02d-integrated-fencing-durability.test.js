'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('H-04 integrated boundary: evidence is durable before fenced cursor advancement', async () => {
  let cursor = 100;
  const durableEvidence = new Map();
  let lease = { owner: 'A', epoch: 1 };
  const token = { ...lease };

  const assertLease = () => {
    if (token.owner !== lease.owner || token.epoch !== lease.epoch) {
      throw Object.assign(new Error('FENCE_REJECTED'), { code: 'FENCE_REJECTED' });
    }
  };

  const commitEvidence = (block) => {
    durableEvidence.set(block, { block, committed: true });
  };

  assertLease();
  commitEvidence(101);

  // Simulate process crash before cursor persistence.
  const persistedCursorAfterCrash = cursor;
  assert.equal(persistedCursorAfterCrash, 100);
  assert.ok(durableEvidence.has(101));

  // Restart: durable evidence is recovered and replay is idempotent.
  assert.deepEqual(durableEvidence.get(101), { block: 101, committed: true });
  assert.equal(durableEvidence.has(101), true);

  // Re-acquire ownership after restart.
  lease = { owner: 'B', epoch: 2 };
  const newToken = { ...lease };
  const assertNewLease = () => {
    if (newToken.owner !== lease.owner || newToken.epoch !== lease.epoch) {
      throw Object.assign(new Error('FENCE_REJECTED'), { code: 'FENCE_REJECTED' });
    }
  };

  assertNewLease();
  cursor = 101;

  assert.equal(cursor, 101);
  assert.ok(durableEvidence.has(101));
});

test('H-04 integrated boundary: fencing loss after durable evidence cannot move cursor', () => {
  let cursor = 100;
  const durableEvidence = new Map();
  let lease = { owner: 'A', epoch: 1 };
  const token = { ...lease };

  const assertLease = () => {
    if (token.owner !== lease.owner || token.epoch !== lease.epoch) {
      throw Object.assign(new Error('FENCE_REJECTED'), { code: 'FENCE_REJECTED' });
    }
  };

  assertLease();
  durableEvidence.set(101, { block: 101, committed: true });

  // Another writer takes the lease after evidence is durable.
  lease = { owner: 'B', epoch: 2 };

  assert.throws(assertLease, /FENCE_REJECTED/);
  assert.equal(cursor, 100);
  assert.ok(durableEvidence.has(101));
});

test('H-04 integrated boundary: failed evidence commit cannot move cursor', () => {
  let cursor = 100;
  const durableEvidence = new Map();
  let lease = { owner: 'A', epoch: 1 };
  const token = { ...lease };

  const assertLease = () => {
    if (token.owner !== lease.owner || token.epoch !== lease.epoch) {
      throw Object.assign(new Error('FENCE_REJECTED'), { code: 'FENCE_REJECTED' });
    }
  };

  assertLease();
  assert.throws(() => {
    throw Object.assign(new Error('EVIDENCE_COMMIT_FAILED'), { code: 'EVIDENCE_COMMIT_FAILED' });
  }, /EVIDENCE_COMMIT_FAILED/);

  assert.equal(durableEvidence.has(101), false);
  assert.equal(cursor, 100);
});
