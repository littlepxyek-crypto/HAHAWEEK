'use strict';

/**
 * STEP 525 — deterministic F-03 generation/conflict/recovery evidence.
 * Offline only; no V4 activation or production cutover.
 */

function assertGeneration({ expectedGeneration, actualGeneration }) {
  if (expectedGeneration == null || actualGeneration == null) {
    throw new Error('GENERATION_MISSING');
  }
  if (expectedGeneration !== actualGeneration) {
    throw new Error('GENERATION_CONFLICT');
  }
  return { status: 'MATCHED', generation: actualGeneration };
}

function assertRecoveryAuthority({ persistedGeneration, persistedCheckpoint, cursorGeneration }) {
  if (persistedGeneration == null || persistedCheckpoint == null || cursorGeneration == null) {
    throw new Error('AUTHORITY_INCOMPLETE');
  }
  if (persistedGeneration !== cursorGeneration) {
    throw new Error('GENERATION_CONFLICT');
  }
  if (persistedCheckpoint !== true) {
    throw new Error('CHECKPOINT_NOT_DURABLE');
  }
  return { status: 'RECOVERABLE', generation: persistedGeneration };
}

module.exports = { assertGeneration, assertRecoveryAuthority };
