'use strict';

/**
 * F-03 production-boundary evidence gate.
 *
 * This is a narrow checkpoint-before-cursor guard. It does not activate
 * the V4 authority chain; Gate 2 remains conditional until that cutover
 * is independently proven.
 */
function assertCheckpointBeforeCursor({ checkpointCommitted }) {
  if (checkpointCommitted !== true) {
    throw new Error('CHECKPOINT_NOT_COMMITTED');
  }

  return {
    status: 'AUTHORIZED',
    checkpointCommitted: true,
  };
}

module.exports = {
  assertCheckpointBeforeCursor,
};
