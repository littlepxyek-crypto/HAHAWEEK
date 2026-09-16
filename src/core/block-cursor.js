'use strict';

const { loadState, saveState } = require('./state');

class BlockCursor {
  constructor() {
    this.state = loadState();
  }

  get() {
    return this.state.lastProcessedBlock;
  }

  initialize(blockNumber) {
    if (!Number.isInteger(blockNumber) || blockNumber < 0) {
      throw new Error('INVALID_BLOCK_NUMBER');
    }

    if (this.state.lastProcessedBlock !== null) {
      return this.state.lastProcessedBlock;
    }

    this.state.lastProcessedBlock = blockNumber;
    this.state.status = 'INITIALIZED';
    saveState(this.state);

    return blockNumber;
  }

  advance(blockNumber) {
    if (!Number.isInteger(blockNumber) || blockNumber < 0) {
      throw new Error('INVALID_BLOCK_NUMBER');
    }

    if (
      this.state.lastProcessedBlock !== null &&
      blockNumber < this.state.lastProcessedBlock
    ) {
      throw new Error('BLOCK_CURSOR_REGRESSION');
    }

    this.state.lastProcessedBlock = blockNumber;
    this.state.status = 'RUNNING';
    saveState(this.state);

    return blockNumber;
  }
}

module.exports = {
  BlockCursor,
};
