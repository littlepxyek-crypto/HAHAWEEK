'use strict';

/**
 * F-03 production-boundary evidence helper.
 *
 * This helper does not activate V4 authority. It makes the required
 * checkpoint-before-cursor invariant explicit for tests and audit.
 */
function assertCheckpointBeforeCursor({ checkpointCommitted, cursorAdvanced }) {
  if (checkpointCommitted !== true) {
    throw new Error('CHECKPOINT_NOT_COMMITTED');
  }

  if (cursorAdvanced !== true) {
    throw new Error('CURSOR_NOT_ADVANCED');
  }

  return {
    status: 'AUTHORIZED',
    checkpointCommitted: true,
    cursorAdvanced: true,
  };
}

module.exports = {
  assertCheckpointBeforeCursor,
};
