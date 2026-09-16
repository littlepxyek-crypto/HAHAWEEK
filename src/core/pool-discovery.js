'use strict';

const {
  TOPIC0,
  decodeInitializeLog,
} = require('./initialize-decoder');

const POOL_MANAGER =
  '0x8366a39cc670b4001a1121b8f6a443a643e40951';

const CHAIN_ID = 4663;

function discoverPool(log) {
  if (!log || typeof log.address !== 'string') {
    throw new Error('INVALID_POOL_LOG');
  }

  if (
    log.address.toLowerCase() !==
    POOL_MANAGER.toLowerCase()
  ) {
    throw new Error('INVALID_POOL_MANAGER');
  }

  if (
    !Array.isArray(log.topics) ||
    log.topics[0]?.toLowerCase() !== TOPIC0.toLowerCase()
  ) {
    throw new Error('NOT_INITIALIZE_EVENT');
  }

  const decoded = decodeInitializeLog(log);

  return {
    chainId: CHAIN_ID,
    poolManager: POOL_MANAGER,
    poolId: decoded.poolId,
    currency0: decoded.currency0,
    currency1: decoded.currency1,
    fee: decoded.fee,
    tickSpacing: decoded.tickSpacing,
    hooks: decoded.hooks,
    sqrtPriceX96: decoded.sqrtPriceX96,
    tick: decoded.tick,
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    logIndex: log.index ?? log.logIndex ?? 0,
  };
}

module.exports = {
  CHAIN_ID,
  POOL_MANAGER,
  discoverPool,
};
