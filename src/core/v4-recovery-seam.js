'use strict';

const {
  assertRecoveryAuthority,
  authorizeCursorAdvance,
} = require('./v4-checkpoint-authority');

/**
 * V4 recovery seam.
 *
 * This is the last authority boundary before a caller is allowed
 * to resume processing. It is intentionally side-effect free:
 * it reads the supplied authority snapshot and returns a decision.
 * It never repairs, resets, or mutates cursor/evidence state.
 */
function recoverV4Cursor({
  manifest,
  checkpoint,
  cursor,
  acquisitionPositionValid,
}) {
  try {
    assertRecoveryAuthority({
      manifest,
      checkpoint,
      cursor,
      acquisitionPositionValid,
    });

    return {
      status: 'RECOVERY_RESUME_ALLOWED',
      position: cursor.input.position,
      generation: cursor.input.generation,
      checkpointHash: checkpoint.hash,
    };
  } catch (error) {
    return {
      status: 'RECOVERY_FAIL_CLOSED',
      code: error && error.message ? error.message : 'RECOVERY_AUTHORITY_INVALID',
    };
  }
}

/**
 * Authorize a target position after recovery authority has been
 * established. No state is written here; the caller owns the actual
 * durable cursor commit.
 */
function authorizeV4CursorAdvance({
  currentCursor,
  targetPosition,
  manifest,
  checkpoint,
  cursor,
  acquisitionPositionValid,
}) {
  return authorizeCursorAdvance({
    currentCursor,
    targetPosition,
    manifest,
    checkpoint,
    cursor,
    acquisitionPositionValid,
  });
}

module.exports = {
  recoverV4Cursor,
  authorizeV4CursorAdvance,
};
