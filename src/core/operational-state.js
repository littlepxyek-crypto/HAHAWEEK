'use strict';

const OPERATIONAL_STATES = Object.freeze([
  'INITIALIZING',
  'HEALTHY',
  'DEGRADED',
  'PARTIAL',
  'RECOVERING',
  'BLOCKED',
  'FAILED',
  'UNKNOWN',
]);

const FAILURE_CLASSES = Object.freeze([
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_INVALID',
  'EVIDENCE_UNAVAILABLE',
  'EVIDENCE_INVALID',
  'EVIDENCE_CONFLICT',
  'CANONICALITY_AMBIGUOUS',
  'AUTHORITY_MISMATCH',
  'CHECKPOINT_MISMATCH',
  'CURSOR_PERSISTENCE_FAILURE',
  'WRITER_FENCE_FAILURE',
  'RECOVERY_FAILURE',
  'OPERATIONAL_STATE_CORRUPT',
  'UNKNOWN_FAILURE',
]);

const RETRYABLE = new Set([
  'PROVIDER_UNAVAILABLE',
  'EVIDENCE_UNAVAILABLE',
]);

const CLASSIFICATION = new Map([
  ['CHAIN_ID_MISMATCH', 'PROVIDER_INVALID'],
  ['RPC_UNAVAILABLE', 'PROVIDER_UNAVAILABLE'],
  ['RPC_TIMEOUT', 'PROVIDER_UNAVAILABLE'],
  ['TIMEOUT', 'PROVIDER_UNAVAILABLE'],
  ['NETWORK_ERROR', 'PROVIDER_UNAVAILABLE'],
  ['EVIDENCE_UNAVAILABLE', 'EVIDENCE_UNAVAILABLE'],
  ['EVIDENCE_INVALID', 'EVIDENCE_INVALID'],
  ['EVIDENCE_CONFLICT', 'EVIDENCE_CONFLICT'],
  ['CANONICALITY_AMBIGUOUS', 'CANONICALITY_AMBIGUOUS'],
  ['AUTHORITY_RANGE_MISMATCH', 'AUTHORITY_MISMATCH'],
  ['AUTHORITY_GENERATION_CONTEXT_MISMATCH', 'AUTHORITY_MISMATCH'],
  ['AUTHORITY_CURSOR_CONTEXT_MISMATCH', 'AUTHORITY_MISMATCH'],
  ['AUTHORITY_BINDING_INVALID', 'AUTHORITY_MISMATCH'],
  ['CHECKPOINT_NOT_COMMITTED', 'CHECKPOINT_MISMATCH'],
  ['CURSOR_WRITE_FAILED', 'CURSOR_PERSISTENCE_FAILURE'],
  ['LIFECYCLE_RECONCILIATION_CURSOR_ADVANCE_FAILED', 'CURSOR_PERSISTENCE_FAILURE'],
  ['WRITER_FENCE_HELD', 'WRITER_FENCE_FAILURE'],
  ['WRITER_FENCE_BUSY', 'WRITER_FENCE_FAILURE'],
  ['WRITER_FENCE_MISSING', 'WRITER_FENCE_FAILURE'],
  ['STALE_WRITER_FENCE', 'WRITER_FENCE_FAILURE'],
  ['WRITER_FENCE_EXPIRED', 'WRITER_FENCE_FAILURE'],
  ['RECOVERY_FAILURE', 'RECOVERY_FAILURE'],
  ['MALFORMED_OPERATIONAL_STATE', 'OPERATIONAL_STATE_CORRUPT'],
  ['INVALID_OPERATIONAL_STATE', 'OPERATIONAL_STATE_CORRUPT'],
]);

function assertOperationalState(value) {
  if (!OPERATIONAL_STATES.includes(value)) {
    const error = new Error('INVALID_OPERATIONAL_STATE');
    error.code = 'INVALID_OPERATIONAL_STATE';
    throw error;
  }
  return value;
}

function assertFailureClass(value) {
  if (!FAILURE_CLASSES.includes(value)) {
    const error = new Error('INVALID_FAILURE_CLASS');
    error.code = 'INVALID_FAILURE_CLASS';
    throw error;
  }
  return value;
}

function errorCode(error) {
  if (error && typeof error.code === 'string' && error.code) return error.code;
  if (error && typeof error.message === 'string' && error.message) return error.message;
  return 'UNKNOWN_FAILURE';
}

function classifyFailure(error) {
  const code = errorCode(error);
  const failureClass = CLASSIFICATION.get(code) || 'UNKNOWN_FAILURE';
  const operationalState =
    failureClass === 'PROVIDER_UNAVAILABLE' ||
    failureClass === 'EVIDENCE_UNAVAILABLE'
      ? 'DEGRADED'
      : failureClass === 'UNKNOWN_FAILURE' ||
        failureClass === 'OPERATIONAL_STATE_CORRUPT'
        ? 'UNKNOWN'
        : 'BLOCKED';

  return Object.freeze({
    failure_class: failureClass,
    failure_code: code,
    boundary: code.startsWith('RPC') || code.includes('PROVIDER') ? 'PROVIDER' : 'RUNTIME',
    recoverability: RETRYABLE.has(failureClass) ? 'RETRYABLE' : 'STOP',
    retry_policy: RETRYABLE.has(failureClass) ? 'RETRY' : 'STOP',
    operational_state: operationalState,
    evidence_impact:
      failureClass === 'EVIDENCE_CONFLICT'
        ? 'CONFLICT_PRESERVED'
        : 'PRESERVE',
    authority_impact:
      operationalState === 'BLOCKED' || operationalState === 'UNKNOWN'
        ? 'NO_ADVANCE'
        : 'UNCHANGED',
    recovery_required: operationalState !== 'DEGRADED',
  });
}

function isRetryableFailure(failure) {
  return !!failure && RETRYABLE.has(failure.failure_class);
}

function createHealthyState(previous = {}) {
  const cursor =
    Number.isInteger(previous.lastProcessedBlock)
      ? previous.lastProcessedBlock
      : null;

  return {
    ...previous,
    operationalState: 'HEALTHY',
    failure: null,
    recovery: {
      state: 'VERIFIED',
      required: false,
    },
    lastVerifiedCursor: cursor,
  };
}

function createFailureState(previous = {}, failure) {
  if (!failure || typeof failure !== 'object') {
    throw new Error('FAILURE_STATE_REQUIRED');
  }

  assertFailureClass(failure.failure_class);
  assertOperationalState(failure.operational_state);

  return {
    ...previous,
    operationalState: failure.operational_state,
    failure,
    recovery: {
      state: failure.recovery_required ? 'REQUIRED' : 'NOT_REQUIRED',
      required: failure.recovery_required,
    },
    lastVerifiedCursor:
      Number.isInteger(previous.lastVerifiedCursor)
        ? previous.lastVerifiedCursor
        : Number.isInteger(previous.lastProcessedBlock)
          ? previous.lastProcessedBlock
          : null,
  };
}

function readOperationalState(state) {
  if (!state || typeof state !== 'object') {
    const error = new Error('MALFORMED_OPERATIONAL_STATE');
    error.code = 'MALFORMED_OPERATIONAL_STATE';
    throw error;
  }

  if (state.operationalState !== undefined) {
    assertOperationalState(state.operationalState);
  }

  if (state.failure !== null && state.failure !== undefined) {
    if (typeof state.failure !== 'object') {
      const error = new Error('MALFORMED_OPERATIONAL_STATE');
      error.code = 'MALFORMED_OPERATIONAL_STATE';
      throw error;
    }
    assertFailureClass(state.failure.failure_class);
  }

  return state;
}

module.exports = {
  OPERATIONAL_STATES,
  FAILURE_CLASSES,
  assertOperationalState,
  assertFailureClass,
  classifyFailure,
  isRetryableFailure,
  createHealthyState,
  createFailureState,
  readOperationalState,
};
