'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RESULTS, evaluateIdentityAwareBoundary } = require('../src/core/identity-aware-ingestion-boundary');

const previous = {
  chainId: 4663,
  blockNumber: 100,
  blockHash: '0x100',
  parentHash: '0x099',
  observedAt: '2026-09-21T00:00:00.000Z'
};

const current = {
  chainId: 4663,
  blockNumber: 101,
  blockHash: '0x101',
  parentHash: '0x100',
  observedAt: '2026-09-21T00:00:01.000Z'
};

test('legacy cursor binds only to matching previous identity', () => {
  const out = evaluateIdentityAwareBoundary({ previous, current, legacyCursor: 100 });
  assert.equal(out.result, RESULTS.CONTINUE);
});

test('legacy cursor mismatch requires reconciliation', () => {
  const out = evaluateIdentityAwareBoundary({ previous, current, legacyCursor: 99 });
  assert.equal(out.result, RESULTS.RECONCILIATION_REQUIRED);
});

test('initial identity can be bound without advancing a cursor', () => {
  const out = evaluateIdentityAwareBoundary({ current });
  assert.equal(out.result, RESULTS.INITIAL_BIND);
});

test('continuous block permits processing', () => {
  const out = evaluateIdentityAwareBoundary({ previous, current });
  assert.equal(out.result, RESULTS.CONTINUE);
});

test('parent mismatch stops before processing', () => {
  const out = evaluateIdentityAwareBoundary({
    previous,
    current: { ...current, parentHash: '0x0ff' }
  });
  assert.equal(out.result, RESULTS.STOP_REORG);
});

test('non-adjacent block fails closed', () => {
  const out = evaluateIdentityAwareBoundary({
    previous,
    current: { ...current, blockNumber: 103, parentHash: '0x102' }
  });
  assert.equal(out.result, RESULTS.FAIL_CLOSED);
});

test('invalid current identity fails closed', () => {
  const out = evaluateIdentityAwareBoundary({
    previous,
    current: { ...current, blockHash: '' }
  });
  assert.equal(out.result, RESULTS.FAIL_CLOSED);
});

test('same block with different hash is a conflict', () => {
  const out = evaluateIdentityAwareBoundary({
    previous,
    current: { ...previous, blockHash: '0xconflict' }
  });
  assert.equal(out.result, RESULTS.CONFLICT);
});

test('boundary is pure', () => {
  const p = JSON.parse(JSON.stringify(previous));
  const c = JSON.parse(JSON.stringify(current));
  evaluateIdentityAwareBoundary({ previous: p, current: c, legacyCursor: 100 });
  assert.deepEqual(p, previous);
  assert.deepEqual(c, current);
});
