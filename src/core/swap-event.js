'use strict';

const { ethers } = require('ethers');

const SWAP_ABI = [
  'event Swap(bytes32 indexed id,address indexed sender,int128 amount0,int128 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick,uint24 fee)'
];

const iface = new ethers.Interface(SWAP_ABI);
const SWAP_TOPIC0 =
  iface.getEvent('Swap').topicHash;

function createSwapEvent(log, pool) {
  if (!log || !pool) {
    throw new Error('SWAP_EVENT_INPUT_REQUIRED');
  }

  if (log.address.toLowerCase() !== pool.poolManager.toLowerCase()) {
    throw new Error('POOL_MANAGER_MISMATCH');
  }

  if (!Array.isArray(log.topics) || log.topics.length !== 3) {
    throw new Error('INVALID_SWAP_TOPIC_COUNT');
  }

  if (
    log.topics[0].toLowerCase() !==
    SWAP_TOPIC0.toLowerCase()
  ) {
    throw new Error('INVALID_SWAP_TOPIC0');
  }

  if (
    typeof log.data !== 'string' ||
    log.data.length !== 2 + 64 * 6
  ) {
    throw new Error('INVALID_SWAP_DATA_LENGTH');
  }

  const parsed = iface.parseLog({
    topics: log.topics,
    data: log.data,
  });

  if (!parsed) {
    throw new Error('SWAP_DECODE_FAILED');
  }

  const poolId = parsed.args.id.toLowerCase();
  const sender = parsed.args.sender.toLowerCase();

  if (poolId !== pool.poolId.toLowerCase()) {
    throw new Error('POOL_ID_MISMATCH');
  }

  const amount0 = parsed.args.amount0.toString();
  const amount1 = parsed.args.amount1.toString();

  return {
    eventType: 'SWAP',
    stage: 'FLOW',

    chainId: pool.chainId,
    poolManager: pool.poolManager.toLowerCase(),
    poolId,

    sender,

    amount0,
    amount1,

    sqrtPriceX96: parsed.args.sqrtPriceX96.toString(),
    liquidity: parsed.args.liquidity.toString(),
    tick: Number(parsed.args.tick),
    fee: Number(parsed.args.fee),

    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash.toLowerCase(),
    logIndex: log.index ?? log.logIndex,

    identity: [
      pool.chainId,
      log.blockNumber,
      log.transactionHash.toLowerCase(),
      log.index ?? log.logIndex,
    ].join(':'),
  };
}

module.exports = {
  SWAP_TOPIC0,
  createSwapEvent,
};
