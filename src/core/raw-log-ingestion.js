'use strict';

const { rpcCall } = require('./rpc-call');

class RawLogIngestion {
  constructor({
    provider,
    appendUnique,
    chainId,
    chunkSize = 10,
  }) {
    if (!provider) throw new Error('PROVIDER_REQUIRED');
    if (typeof appendUnique !== 'function') {
      throw new Error('APPEND_UNIQUE_REQUIRED');
    }
    if (!Number.isInteger(chainId) || chainId <= 0) {
      throw new Error('INVALID_CHAIN_ID');
    }
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      throw new Error('INVALID_CHUNK_SIZE');
    }

    this.provider = provider;
    this.appendUnique = appendUnique;
    this.chainId = chainId;
    this.chunkSize = chunkSize;
  }

  async ingestRange(fromBlock, toBlock, filter = {}) {
    if (!Number.isInteger(fromBlock) || fromBlock < 0) {
      throw new Error('INVALID_FROM_BLOCK');
    }

    if (!Number.isInteger(toBlock) || toBlock < fromBlock) {
      throw new Error('INVALID_TO_BLOCK');
    }

    let fetched = 0;
    let inserted = 0;
    let duplicates = 0;

    for (
      let start = fromBlock;
      start <= toBlock;
      start += this.chunkSize
    ) {
      const end = Math.min(
        start + this.chunkSize - 1,
        toBlock
      );

      const logs = await rpcCall(
        () => this.provider.getLogs({
          ...filter,
          fromBlock: start,
          toBlock: end,
        })
      );

      for (const log of logs) {
        fetched += 1;

        const result = this.appendUnique(
          log,
          this.chainId
        );

        if (result.inserted) {
          inserted += 1;
        } else {
          duplicates += 1;
        }
      }
    }

    return {
      fromBlock,
      toBlock,
      fetched,
      inserted,
      duplicates,
    };
  }
}

module.exports = {
  RawLogIngestion,
};
