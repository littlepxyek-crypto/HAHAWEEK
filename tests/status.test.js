'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { runStatus } = require('../src/status');

test('status exposes blocking failure and STOP boundary', () => {
  const calls = [];

  const state = runStatus(
    message => calls.push(message),
    () => ({
      operationalState: 'BLOCKED',
      lastProcessedBlock: 200,
      lastVerifiedCursor: 200,
      failure: {
        failure_class: 'AUTHORITY_MISMATCH',
        failure_code: 'AUTHORITY_RANGE_MISMATCH',
        boundary: 'RUNTIME',
        recoverability: 'STOP',
        evidence_impact: 'PRESERVE',
        authority_impact: 'NO_ADVANCE',
        recovery_required: true,
      },
      recovery: {
        state: 'REQUIRED',
        required: true,
      },
    })
  );

  assert.equal(state.operationalState, 'BLOCKED');
  assert.equal(calls.includes('STOP: FAIL-CLOSED'), true);
  assert.equal(calls.includes('Failure class: AUTHORITY_MISMATCH'), true);
  assert.equal(calls.includes('Last verified cursor: 200'), true);
});

test('status reports unknown when legacy state has no operational state', () => {
  const calls = [];

  runStatus(message => calls.push(message), () => ({
    lastProcessedBlock: 100,
  }));

  assert.equal(calls.includes('Operational state: UNKNOWN'), true);
  assert.equal(calls.includes('STOP: FAIL-CLOSED'), true);
});
