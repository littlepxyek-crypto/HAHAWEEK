'use strict';

const { validUint64, validHash } = require('./v4-checkpoint-authority');

function assertCursorTransition({ currentCursor, targetPosition, checkpointGeneration, checkpointHash }) {
  if (!currentCursor || !validUint64(currentCursor.generation) || !validUint64(currentCursor.position) || !validHash(currentCursor.checkpoint_hash) || !validHash(currentCursor.cursor_hash) || typeof currentCursor.authority_record_id !== 'string' || currentCursor.authority_record_id.length === 0) throw new Error('CURSOR_STATE_INVALID');
  if (!validUint64(String(targetPosition))) throw new Error('CURSOR_TARGET_INVALID');
  if (!validUint64(String(checkpointGeneration)) || !validHash(checkpointHash)) throw new Error('CHECKPOINT_BOUNDARY_INVALID');
  if (currentCursor.checkpoint_hash !== checkpointHash) throw new Error('CURSOR_CHECKPOINT_MISMATCH');
  if (BigInt(currentCursor.generation) > BigInt(checkpointGeneration)) throw new Error('CURSOR_AHEAD_OF_CHECKPOINT');
  const target = BigInt(String(targetPosition));
  const current = BigInt(currentCursor.position);
  if (target < current) throw new Error('BLOCK_CURSOR_REGRESSION');
  return { authorized: true, idempotent: target === current, currentPosition: currentCursor.position, targetPosition: String(targetPosition) };
}

module.exports = { assertCursorTransition };