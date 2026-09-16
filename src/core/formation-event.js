'use strict';

function createFormationEvent(pool) {
  if (!pool || typeof pool !== 'object') {
    throw new Error('INVALID_POOL');
  }

  if (!Number.isInteger(pool.chainId) || pool.chainId <= 0) {
    throw new Error('INVALID_CHAIN_ID');
  }

  if (typeof pool.poolManager !== 'string' || !pool.poolManager) {
    throw new Error('INVALID_POOL_MANAGER');
  }

  if (typeof pool.poolId !== 'string' || !pool.poolId) {
    throw new Error('INVALID_POOL_ID');
  }

  if (
    typeof pool.transactionHash !== 'string' ||
    !pool.transactionHash
  ) {
    throw new Error('INVALID_TRANSACTION_HASH');
  }

  if (!Number.isInteger(pool.blockNumber) || pool.blockNumber < 0) {
    throw new Error('INVALID_BLOCK_NUMBER');
  }

  if (!Number.isInteger(pool.logIndex) || pool.logIndex < 0) {
    throw new Error('INVALID_LOG_INDEX');
  }

  return {
    eventId: [
      pool.chainId,
      pool.blockNumber,
      pool.transactionHash.toLowerCase(),
      pool.logIndex,
    ].join(':'),

    eventType: 'POOL_INITIALIZED',
    stage: 'FORMATION',

    chainId: pool.chainId,
    poolManager: pool.poolManager.toLowerCase(),
    poolId: pool.poolId.toLowerCase(),

    currency0: pool.currency0.toLowerCase(),
    currency1: pool.currency1.toLowerCase(),

    fee: pool.fee,
    tickSpacing: pool.tickSpacing,
    hooks: pool.hooks.toLowerCase(),

    sqrtPriceX96: String(pool.sqrtPriceX96),
    tick: pool.tick,

    blockNumber: pool.blockNumber,
    transactionHash: pool.transactionHash.toLowerCase(),
    logIndex: pool.logIndex,

    identity: pool.identity,
  };
}

module.exports = {
  createFormationEvent,
};
