'use strict';

/**
 * STEP 524 — F-03 authority-chain evidence.
 *
 * Validates the required ordering and binding of:
 * SEGMENTS -> MANIFEST -> CHECKPOINT -> CURSOR.
 * This is deterministic/offline evidence only; it does not activate V4.
 */

function assertAuthorityChain({ segmentsCommitted, manifestCommitted, checkpointCommitted, cursorAdvanceRequested }) {
  if (segmentsCommitted !== true) throw new Error('SEGMENTS_NOT_COMMITTED');
  if (manifestCommitted !== true) throw new Error('MANIFEST_NOT_COMMITTED');
  if (checkpointCommitted !== true) throw new Error('CHECKPOINT_NOT_COMMITTED');

  return {
    status: cursorAdvanceRequested === true ? 'AUTHORIZED' : 'READY',
    segmentsCommitted: true,
    manifestCommitted: true,
    checkpointCommitted: true,
  };
}

function assertAuthorityBinding({ manifestMatchesSegments, checkpointMatchesManifest }) {
  if (manifestMatchesSegments !== true) throw new Error('MANIFEST_SEGMENT_MISMATCH');
  if (checkpointMatchesManifest !== true) throw new Error('CHECKPOINT_MANIFEST_MISMATCH');
  return { status: 'BOUND' };
}

module.exports = { assertAuthorityChain, assertAuthorityBinding };
