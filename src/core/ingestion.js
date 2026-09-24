'use strict';

const { getSafeHead } = require('./confirmation');
const { rpcCall } = require('./rpc-call');

class IngestionEngine {
  constructor({
    provider,
    cursor,
    confirmations,
    processor,
    processorRange,
    batchSize,
      maxBatchesPerRun,
    authorityGate,
  }) {
    if (!provider) {
      throw new Error('PROVIDER_REQUIRED');
    }

    if (!cursor) {
      throw new Error('CURSOR_REQUIRED');
    }

    if (!processor) {
      throw new Error('PROCESSOR_REQUIRED');
    }

    if (
      !Number.isInteger(confirmations) ||
      confirmations < 0
    ) {
      throw new Error('INVALID_CONFIRMATIONS');
    }

    if (
      processorRange !== undefined &&
      typeof processorRange !== 'function'
    ) {
      throw new Error('INVALID_PROCESSOR_RANGE');
    }

    if (
      batchSize !== undefined &&
      (!Number.isInteger(batchSize) || batchSize <= 0)
    ) {
      throw new Error('INVALID_BATCH_SIZE');
    }

    if (
      maxBatchesPerRun !== undefined &&
      (!Number.isInteger(maxBatchesPerRun) || maxBatchesPerRun <= 0)
    ) {
      throw new Error('INVALID_MAX_BATCHES_PER_RUN');
    }

    if (
      processorRange !== undefined &&
      batchSize === undefined
    ) {
      throw new Error('BATCH_SIZE_REQUIRED');
    }

    this.provider = provider;
    this.cursor = cursor;
    this.confirmations = confirmations;
    this.processor = processor;
    this.processorRange = processorRange;
    this.batchSize = batchSize;
    this.maxBatchesPerRun = maxBatchesPerRun ?? Infinity;
    this.authorityGate = authorityGate || (() => ({ status: 'UNGUARDED' }));
    this.running = false;
  }

  async runOnce() {
    if (this.running) {
      throw new Error('INGESTION_ALREADY_RUNNING');
    }

    this.running = true;

    try {
      const latestBlock = await rpcCall(
        () => this.provider.getBlockNumber()
      );

      const safeHead = getSafeHead(
        latestBlock,
        this.confirmations
      );

      let current = this.cursor.get();

      /*
       * First run:
       * establish a safe starting point without
       * processing historical blocks.
       */
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

      /*
       * Already caught up.
       */
      if (current >= safeHead) {
        return {
          processed: 0,
          latestBlock,
          safeHead,
          cursor: current,
        };
      }

      let processed = 0;

      /*
       * ============================================================
       * BATCH PROCESSOR PATH
       * ============================================================
       *
       * A batch is processed as one checkpoint unit.
       *
       * IMPORTANT:
       * cursor advances ONLY after processorRange succeeds.
       *
       * Example:
       *
       * current = 100
       * batchSize = 5
       *
       * processorRange(101, 105)
       *       ↓ success
       * cursor = 105
       *
       * processorRange(106, 110)
       *       ↓ failure
       * cursor remains 105
       *
       * This guarantees restart recovery from the last
       * successfully completed batch.
       */
      if (typeof this.processorRange === 'function') {
        let batchesProcessed = 0;

        for (
          let fromBlock = current + 1;
          fromBlock <= safeHead &&
              batchesProcessed < this.maxBatchesPerRun;
          fromBlock += this.batchSize
        ) {
          const toBlock = Math.min(
            fromBlock + this.batchSize - 1,
            safeHead
          );

          /*
           * DO NOT advance cursor before this resolves.
           */
          await this.processorRange(
            fromBlock,
            toBlock
          );

          /*
           * Batch completed successfully.
           * Now and only now advance the checkpoint.
           */
          this.authorityGate({ checkpointCommitted: true, blockNumber: toBlock });
          this.cursor.advance(toBlock);

          processed += toBlock - fromBlock + 1;
            batchesProcessed += 1;
        }

        return {
          processed,
          latestBlock,
          safeHead,
          cursor: this.cursor.get(),
        };
      }

      /*
       * ============================================================
       * LEGACY SINGLE-BLOCK PROCESSOR PATH
       * ============================================================
       *
       * Existing behavior is preserved.
       *
       * This path remains active when processorRange is not supplied.
       */
      for (
        let block = current + 1;
        block <= safeHead;
        block += 1
      ) {
        await this.processor(block);

        /*
         * Cursor advances ONLY after successful processing.
         */
        this.authorityGate({ checkpointCommitted: true, blockNumber: block });
        this.cursor.advance(block);

        processed += 1;
      }

      return {
        processed,
        latestBlock,
        safeHead,
        cursor: this.cursor.get(),
      };
    } finally {
      this.running = false;
    }
  }
}

module.exports = {
  IngestionEngine,
};
