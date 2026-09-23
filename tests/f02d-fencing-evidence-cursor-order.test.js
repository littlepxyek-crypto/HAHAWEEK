'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function fencedCommit({ lease, token, evidence, cursor, block, commitEvidence }) {
  lease.assertOwner(token);
  commitEvidence(block, evidence);
  try {
    lease.assertOwner(token);
  } catch (error) {
    return { committed: true, cursorAdvanced: false, error };
  }
  cursor.advance(block);
  return { committed: true, cursorAdvanced: true };
}

function makeLease() {
  let current = null;
  let epoch = 0;
  return {
    acquire(owner) {
      current = { owner, epoch: ++epoch };
      return current;
    },
    replace(owner) {
      current = { owner, epoch: ++epoch };
      return current;
    },
    assertOwner(token) {
      if (!current || token.owner !== current.owner || token.epoch !== current.epoch) {
        throw Object.assign(new Error('FENCE_REJECTED'), { code: 'FENCE_REJECTED' });
      }
    }
  };
}

test('lease held: evidence commits before cursor advances', () => {
  const lease = makeLease();
  const token = lease.acquire('writer-A');
  const evidence = [];
  let cursor = 100;

  const result = fencedCommit({
    lease,
    token,
    evidence,
    cursor: { advance(block) { cursor = block; } },
    block: 101,
    commitEvidence(block, store) { store.push(block); }
  });

  assert.equal(result.cursorAdvanced, true);
  assert.deepEqual(evidence, [101]);
  assert.equal(cursor, 101);
});

test('lease lost before processing: no evidence and no cursor advance', () => {
  const lease = makeLease();
  const token = lease.acquire('writer-A');
  lease.replace('writer-B');

  const evidence = [];
  let cursor = 100;

  assert.throws(() => fencedCommit({
    lease,
    token,
    evidence,
    cursor: { advance(block) { cursor = block; } },
    block: 101,
    commitEvidence(block, store) { store.push(block); }
  }), /FENCE_REJECTED/);

  assert.deepEqual(evidence, []);
  assert.equal(cursor, 100);
});

test('lease lost after evidence commit: evidence is preserved but cursor does not advance', () => {
  const lease = makeLease();
  const token = lease.acquire('writer-A');
  const evidence = [];
  let cursor = 100;

  const result = fencedCommit({
    lease,
    token,
    evidence,
    cursor: { advance(block) { cursor = block; } },
    block: 101,
    commitEvidence(block, store) {
      store.push(block);
      lease.replace('writer-B');
    }
  });

  assert.equal(result.committed, true);
  assert.equal(result.cursorAdvanced, false);
  assert.equal(result.error.code, 'FENCE_REJECTED');
  assert.deepEqual(evidence, [101]);
  assert.equal(cursor, 100);
});

test('new writer can resume from durable boundary', () => {
  const lease = makeLease();
  const oldToken = lease.acquire('writer-A');
  const evidence = [101];
  let cursor = 100;

  lease.replace('writer-B');
  const newToken = lease.acquire('writer-B');

  lease.assertOwner(newToken);
  assert.ok(evidence.includes(101));
  cursor = 101;

  assert.equal(cursor, 101);
  assert.throws(() => lease.assertOwner(oldToken), /FENCE_REJECTED/);
});
