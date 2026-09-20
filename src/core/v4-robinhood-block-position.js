'use strict';

const { validUint64 } = require('./v4-checkpoint-authority');

function blockNumberToPosition(blockNumber) {
  if (!Number.isSafeInteger(blockNumber) || blockNumber < 0) {
    throw new Error('ACQUISITION_BLOCK_INVALID');
  }
  return String(blockNumber);
}

function assertPositionMatchesBlock(position, blockNumber) {
  if (!validUint64(position)) throw new Error('ACQUISITION_POSITION_INVALID');
  const mapped = blockNumberToPosition(blockNumber);
  if (position !== mapped) throw new Error('ACQUISITION_POSITION_MISMATCH');
  return true;
}

module.exports = { blockNumberToPosition, assertPositionMatchesBlock };
