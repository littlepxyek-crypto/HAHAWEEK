'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  OPERATIONAL_STATES,
  FAILURE_CLASSES,
  readOperationalState,
} = require('../core/operational-state');

const SAFE_FAILURE_CODE = /^[A-Z0-9_:-]{1,100}$/;
const DEFAULT_STALE_AFTER_MS = 60000;
const MIN_STALE_AFTER_MS = 1000;
const MAX_STALE_AFTER_MS = 3600000;

function resolveFreshness(updatedAt, sampledAt, configuredThreshold) {
  const configured = configuredThreshold === undefined
    ? process.env.HAHAWEEK_OBSERVE_STALE_AFTER_MS
    : configuredThreshold;
  const threshold = configured === undefined || configured === ''
    ? DEFAULT_STALE_AFTER_MS
    : Number(configured);
  if (!Number.isSafeInteger(threshold) ||
      threshold < MIN_STALE_AFTER_MS ||
      threshold > MAX_STALE_AFTER_MS) {
    return { freshnessStatus: 'UNKNOWN', sourceAgeMs: null };
  }
  if (typeof updatedAt !== 'string' || updatedAt.length > 100) {
    return { freshnessStatus: 'UNKNOWN', sourceAgeMs: null };
  }
  const updatedMs = Date.parse(updatedAt);
  const sampledMs = Date.parse(sampledAt);
  if (!Number.isFinite(updatedMs) || !Number.isFinite(sampledMs) || updatedMs > sampledMs) {
    return { freshnessStatus: 'UNKNOWN', sourceAgeMs: null };
  }
  const sourceAgeMs = sampledMs - updatedMs;
  return {
    freshnessStatus: sourceAgeMs > threshold ? 'STALE' : 'FRESH',
    sourceAgeMs,
  };
}

function safeFailure(failure) {
  if (!failure || typeof failure !== 'object') return null;

  const failureClass = FAILURE_CLASSES.includes(failure.failure_class)
    ? failure.failure_class
    : null;
  const failureCode =
    typeof failure.failure_code === 'string' &&
    SAFE_FAILURE_CODE.test(failure.failure_code)
      ? failure.failure_code
      : null;

  if (!failureClass && !failureCode) return null;

  return {
    failure_class: failureClass,
    failure_code: failureCode,
    recoverability:
      failure.recoverability === 'RETRYABLE' || failure.recoverability === 'STOP'
        ? failure.recoverability
        : null,
  };
}

function unknownSnapshot(source, sampledAt, sourceState, errorCode = null) {
  return {
    schemaVersion: 1,
    source,
    sampledAt,
    sourceState,
    operationalState: 'UNKNOWN',
    sourceUpdatedAt: null,
    freshnessStatus: 'UNKNOWN',
    sourceAgeMs: null,
    lastProcessedBlock: null,
    lastVerifiedCursor: null,
    failure: null,
    errorCode,
    processLiveness: 'UNKNOWN',
    note: 'This snapshot does not independently prove process liveness.',
  };
}

/**
 * Reads an existing state file without creating directories or files.
 * This function intentionally does not use core/state.loadState(), because
 * loadState() calls ensureDir() and is therefore not strictly read-only.
 */
function readStateSnapshot(options = {}) {
  const stateFile = options.stateFile || process.env.HAHAWEEK_STATE_FILE ||
    path.join(process.env.HAHAWEEK_DATA_DIR || path.join(process.cwd(), 'data'), 'state.json');
  const sampledAt = (options.now || (() => new Date().toISOString()))();
  const source = path.resolve(stateFile);

  let text;
  try {
    text = fs.readFileSync(stateFile, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return unknownSnapshot(source, sampledAt, 'MISSING', 'STATE_FILE_MISSING');
    }
    return unknownSnapshot(source, sampledAt, 'UNAVAILABLE', 'STATE_FILE_UNREADABLE');
  }

  let state;
  try {
    state = JSON.parse(text);
  } catch {
    return unknownSnapshot(source, sampledAt, 'MALFORMED', 'STATE_JSON_MALFORMED');
  }

  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return unknownSnapshot(source, sampledAt, 'MALFORMED', 'STATE_SHAPE_INVALID');
  }

  try {
    readOperationalState(state);
  } catch (error) {
    return unknownSnapshot(
      source,
      sampledAt,
      'MALFORMED',
      error && typeof error.code === 'string' ? error.code : 'OPERATIONAL_STATE_INVALID'
    );
  }

  const candidateState =
    state.operationalState !== undefined ? state.operationalState : state.status;
  const operationalState = OPERATIONAL_STATES.includes(candidateState)
    ? candidateState
    : 'UNKNOWN';
  const cursor = Number.isSafeInteger(state.lastProcessedBlock) && state.lastProcessedBlock >= 0
    ? state.lastProcessedBlock
    : null;
  const verifiedCursor =
    Number.isSafeInteger(state.lastVerifiedCursor) && state.lastVerifiedCursor >= 0
      ? state.lastVerifiedCursor
      : null;

  const sourceUpdatedAt =
    typeof state.updatedAt === 'string' && state.updatedAt.length <= 100
      ? state.updatedAt
      : null;
  const freshness = resolveFreshness(sourceUpdatedAt, sampledAt, options.staleAfterMs);

  return {
    schemaVersion: 1,
    source,
    sampledAt,
    sourceState: 'AVAILABLE',
    operationalState,
    sourceUpdatedAt,
    ...freshness,
    lastProcessedBlock: cursor,
    lastVerifiedCursor: verifiedCursor,
    failure: safeFailure(state.failure),
    errorCode: null,
    processLiveness: 'UNKNOWN',
    note: 'State-file readability is not proof that the HAHAWEEK runner is alive.',
  };
}

module.exports = {
  readStateSnapshot,
  resolveFreshness,
};
