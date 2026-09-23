'use strict';

const { RESULTS: IDENTITY, validateBlockIdentity, classify } = require('./block-identity');
const { RESULTS: BOUNDARY, evaluateRuntimeBoundary } = require('./runtime-reorg-boundary');

const RESULTS = Object.freeze({
  INITIAL_BIND: 'INITIAL_BIND',
  CONTINUE: 'CONTINUE',
  STOP_REORG: 'STOP_REORG',
  FAIL_CLOSED: 'FAIL_CLOSED',
  CONFLICT: 'CONFLICT',
  RECONCILIATION_REQUIRED: 'RECONCILIATION_REQUIRED'
});

function evaluateIdentityAwareBoundary({ previous, current, legacyCursor }) {
  if (legacyCursor !== undefined) {
    if (!Number.isInteger(legacyCursor) || legacyCursor < 0) {
      return { result: RESULTS.RECONCILIATION_REQUIRED };
    }
    if (!previous || previous.blockNumber !== legacyCursor) {
      return { result: RESULTS.RECONCILIATION_REQUIRED };
    }
  }

  if (validateBlockIdentity(current) !== IDENTITY.VALID) {
    return { result: RESULTS.FAIL_CLOSED };
  }

  if (!previous) {
    return { result: RESULTS.INITIAL_BIND, current };
  }

  if (validateBlockIdentity(previous) !== IDENTITY.VALID) {
    return { result: RESULTS.FAIL_CLOSED };
  }

  if (classify(previous, current) === IDENTITY.CONFLICT) {
    return { result: RESULTS.CONFLICT };
  }

  const boundary = evaluateRuntimeBoundary({ previous, current });

  if (boundary.result === BOUNDARY.CONTINUE) {
    return { result: RESULTS.CONTINUE, current };
  }

  if (boundary.result === BOUNDARY.STOP_REORG) {
    return { result: RESULTS.STOP_REORG };
  }

  return { result: RESULTS.FAIL_CLOSED };
}

module.exports = { RESULTS, evaluateIdentityAwareBoundary };
