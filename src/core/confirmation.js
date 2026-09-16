'use strict';

function getSafeHead(headBlock, confirmations) {
  if (!Number.isInteger(headBlock) || headBlock < 0) {
    throw new Error('INVALID_HEAD_BLOCK');
  }

  if (!Number.isInteger(confirmations) || confirmations < 0) {
    throw new Error('INVALID_CONFIRMATIONS');
  }

  return Math.max(0, headBlock - confirmations);
}

module.exports = {
  getSafeHead,
};
