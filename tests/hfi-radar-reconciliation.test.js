'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createRadarReconciliation } = require('../src/core/hfi-radar-reconciliation');

function radar(id, evidenceIds) {
  return { radar_id: id, evidence_ids: evidenceIds };
}

test('records deterministic reorg reconciliation while preserving prior observation', () => {
  const input = {
    reason: 'REORG',
    previous: radar('radar:v1:old', ['ei:old-a', 'ei:old-b']),
    current: radar('radar:v1:new', ['ei:new-a', 'ei:new-b']),
  };

  const first = createRadarReconciliation(input);
  const second = createRadarReconciliation(input);

  assert.equal(first.state, 'RECONCILED');
  assert.equal(first.historical_previous_preserved, true);
  assert.equal(first.authoritative_evidence_mutated, false);
  assert.equal(first.reconciliation_id, second.reconciliation_id);
});

test('distinguishes unchanged replay from conflict', () => {
  const unchanged = createRadarReconciliation({
    reason: 'CANONICALITY_CHANGE',
    previous: radar('radar:v1:same', ['ei:a', 'ei:b']),
    current: radar('radar:v1:same', ['ei:b', 'ei:a']),
  });
  assert.equal(unchanged.state, 'UNCHANGED');

  const conflict = createRadarReconciliation({
    reason: 'CANONICALITY_CHANGE',
    previous: radar('radar:v1:same', ['ei:a']),
    current: radar('radar:v1:same', ['ei:b']),
  });
  assert.equal(conflict.state, 'CONFLICT');
});

test('rejects unsupported reconciliation reasons', () => {
  assert.throws(
    () => createRadarReconciliation({
      reason: 'ROLLBACK',
      previous: radar('radar:v1:a', ['ei:a']),
      current: radar('radar:v1:b', ['ei:b']),
    }),
    /RECONCILIATION_REASON_INVALID/
  );
});
