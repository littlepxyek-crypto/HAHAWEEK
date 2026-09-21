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

const next = (overrides = {}) => ({
  chainId: 4663,
  blockNumber: 101,
  blockHash: '0x101',
  parentHash: '0x100',
  observedAt: '2026-09-21T00:00:01.000Z',
  ...overrides
});

function harness({ current, evidenceCommit = true, legacyCursor }) {
  const state = { cursor: previous.blockNumber, evidence: [] };
  const decision = evaluateIdentityAwareBoundary({
    previous,
    current,
    legacyCursor
  });

  if (decision.result !== RESULTS.CONTINUE) {
    return { decision, state };
  }

  if (!evidenceCommit) {
    return { decision, state, commit: false };
  }

  state.evidence.push(current);
  state.cursor = current.blockNumber;
  return { decision, state, commit: true };
}

test('CONTINUE commits evidence before advancing cursor', () => {
  const out = harness({ current: next() });
  assert.equal(out.decision.result, RESULTS.CONTINUE);
  assert.equal(out.state.evidence.length, 1);
  assert.equal(out.state.cursor, 101);
});

test('REORG_DETECTED prevents evidence processing and cursor advancement', () => {
  const out = harness({ current: next({ blockHash: '0xfork', parentHash: '0x0ff' }) });
  assert.equal(out.decision.result, RESULTS.STOP_REORG);
  assert.equal(out.state.evidence.length, 0);
  assert.equal(out.state.cursor, 100);
});

test('FAIL_CLOSED prevents advancement', () => {
  const out = harness({ current: next({ blockNumber: 103, parentHash: '0x102' }) });
  assert.equal(out.decision.result, RESULTS.FAIL_CLOSED);
  assert.equal(out.state.cursor, 100);
});

test('CONFLICT is isolated', () => {
  const out = harness({ current: { ...previous, blockHash: '0xconflict' } });
  assert.equal(out.decision.result, RESULTS.CONFLICT);
  assert.equal(out.state.cursor, 100);
  assert.equal(out.state.evidence.length, 0);
});

test('legacy mismatch requires reconciliation', () => {
  const out = harness({ current: next(), legacyCursor: 99 });
  assert.equal(out.decision.result, RESULTS.RECONCILIATION_REQUIRED);
  assert.equal(out.state.cursor, 100);
});

test('evidence commit failure cannot advance cursor', () => {
  const out = harness({ current: next(), evidenceCommit: false });
  assert.equal(out.decision.result, RESULTS.CONTINUE);
  assert.equal(out.commit, false);
  assert.equal(out.state.evidence.length, 0);
  assert.equal(out.state.cursor, 100);
});

test('replay is idempotent at the harness boundary', () => {
  const first = harness({ current: next() });
  const replay = harness({ current: next() });
  assert.deepEqual(first.state, replay.state);
});
