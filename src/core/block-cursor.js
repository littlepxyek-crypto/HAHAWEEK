'use strict';

const { loadState, saveState } = require('./state');

class BlockCursor {
  constructor(options = {}) {
    this.loadState = options.loadState || loadState;
    this.saveState = options.saveState || saveState;
    this.state = this.loadState();
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

    const nextState = {
      ...this.state,
      lastProcessedBlock: blockNumber,
      status: 'INITIALIZED',
    };

    this.saveState(nextState);
    this.state = nextState;

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

    const nextState = {
      ...this.state,
      lastProcessedBlock: blockNumber,
      status: 'RUNNING',
    };

    this.saveState(nextState);
    this.state = nextState;

    return blockNumber;
  }
}

module.exports = {
  BlockCursor,
};
