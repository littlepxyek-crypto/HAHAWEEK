'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldRetryOperationalState } = require('../src/runner');

test('runner retries provider-unavailable state', () => {
  assert.equal(
    shouldRetryOperationalState({
      operationalState: 'DEGRADED',
      failure: {
        failure_class: 'PROVIDER_UNAVAILABLE',
      },
    }),
    true
  );
});

test('runner stops on blocked authority state', () => {
  assert.equal(
    shouldRetryOperationalState({
      operationalState: 'BLOCKED',
      failure: {
        failure_class: 'AUTHORITY_MISMATCH',
      },
    }),
    false
  );
});

test('runner stops when operational state is malformed', () => {
  assert.equal(
    shouldRetryOperationalState({
      operationalState: 'NOT_VALID',
      failure: null,
    }),
    false
  );
});
