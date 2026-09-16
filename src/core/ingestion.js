'use strict';

const { getSafeHead } = require('./confirmation');

class IngestionEngine {
  constructor({ provider, cursor, confirmations, processor }) {
    if (!provider) throw new Error('PROVIDER_REQUIRED');
    if (!cursor) throw new Error('CURSOR_REQUIRED');
    if (!processor) throw new Error('PROCESSOR_REQUIRED');

    if (!Number.isInteger(confirmations) || confirmations < 0) {
      throw new Error('INVALID_CONFIRMATIONS');
    }

    this.provider = provider;
    this.cursor = cursor;
    this.confirmations = confirmations;
    this.processor = processor;
  }

  async runOnce() {
    const latestBlock = await this.provider.getBlockNumber();
    const safeHead = getSafeHead(latestBlock, this.confirmations);

    let current = this.cursor.get();

    if (current === null) {
      current = safeHead;
      this.cursor.initialize(current);
      return {
        processed: 0,
        latestBlock,
        safeHead,
        cursor: current,
      };
    }

    if (current >= safeHead) {
      return {
        processed: 0,
        latestBlock,
        safeHead,
        cursor: current,
      };
    }

    let processed = 0;

    for (let block = current + 1; block <= safeHead; block += 1) {
      await this.processor(block);
      this.cursor.advance(block);
      processed += 1;
    }

    return {
      processed,
      latestBlock,
      safeHead,
      cursor: this.cursor.get(),
    };
  }
}

module.exports = {
  IngestionEngine,
};
