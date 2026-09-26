'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyFailure,
  createFailureState,
  createHealthyState,
  isRetryableFailure,
  readOperationalState,
} = require('../src/core/operational-state');

test('provider timeout is retryable and degraded', () => {
  const failure = classifyFailure(Object.assign(new Error('TIMEOUT'), { code: 'TIMEOUT' }));

  assert.equal(failure.failure_class, 'PROVIDER_UNAVAILABLE');
  assert.equal(failure.operational_state, 'DEGRADED');
  assert.equal(failure.recoverability, 'RETRYABLE');
  assert.equal(isRetryableFailure(failure), true);
  assert.equal(failure.authority_impact, 'UNCHANGED');
});

test('authority mismatch is blocked and non-retryable', () => {
  const failure = classifyFailure(new Error('AUTHORITY_GENERATION_CONTEXT_MISMATCH'));

  assert.equal(failure.failure_class, 'AUTHORITY_MISMATCH');
  assert.equal(failure.operational_state, 'BLOCKED');
  assert.equal(failure.recoverability, 'STOP');
  assert.equal(isRetryableFailure(failure), false);
  assert.equal(failure.authority_impact, 'NO_ADVANCE');
});

test('unknown failure fails closed', () => {
  const failure = classifyFailure(new Error('UNSEEN_FAILURE'));

  assert.equal(failure.failure_class, 'UNKNOWN_FAILURE');
  assert.equal(failure.operational_state, 'UNKNOWN');
  assert.equal(failure.recoverability, 'STOP');
  assert.equal(isRetryableFailure(failure), false);
});

test('failure state preserves last verified cursor', () => {
  const state = createFailureState(
    {
      lastProcessedBlock: 120,
      lastVerifiedCursor: 120,
      operationalState: 'HEALTHY',
    },
    classifyFailure(new Error('AUTHORITY_RANGE_MISMATCH'))
  );

  assert.equal(state.operationalState, 'BLOCKED');
  assert.equal(state.lastVerifiedCursor, 120);
  assert.equal(state.failure.failure_class, 'AUTHORITY_MISMATCH');
  assert.equal(state.recovery.required, true);
});

test('healthy state clears failure without changing cursor', () => {
  const state = createHealthyState({
    lastProcessedBlock: 130,
    lastVerifiedCursor: 130,
    failure: {
      failure_class: 'PROVIDER_UNAVAILABLE',
    },
    operationalState: 'DEGRADED',
  });

  assert.equal(state.operationalState, 'HEALTHY');
  assert.equal(state.failure, null);
  assert.equal(state.lastVerifiedCursor, 130);
});

test('malformed persisted operational state fails closed', () => {
  assert.throws(
    () => readOperationalState({
      operationalState: 'NOT_A_STATE',
    }),
    /INVALID_OPERATIONAL_STATE/
  );

  assert.throws(
    () => readOperationalState({
      operationalState: 'BLOCKED',
      failure: {
        failure_class: 'NOT_A_FAILURE',
      },
    }),
    /INVALID_FAILURE_CLASS/
  );
});
