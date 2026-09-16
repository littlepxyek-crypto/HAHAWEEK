'use strict';

const { ethers } = require('ethers');

const INITIALIZE_ABI = [
  'event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)'
];

const iface = new ethers.Interface(INITIALIZE_ABI);
const TOPIC0 = iface.getEvent('Initialize').topicHash;

function decodeInitializeLog(log) {
  if (!log || !Array.isArray(log.topics) || typeof log.data !== 'string') {
    throw new Error('INVALID_LOG');
  }

  if (log.topics.length !== 4) {
    throw new Error('INVALID_INITIALIZE_TOPIC_COUNT');
  }

  if ((log.data.length - 2) / 2 !== 160) {
    throw new Error('INVALID_INITIALIZE_DATA_LENGTH');
  }

  if (log.topics[0].toLowerCase() !== TOPIC0.toLowerCase()) {
    throw new Error('INVALID_INITIALIZE_TOPIC0');
  }

  const parsed = iface.parseLog({
    topics: log.topics,
    data: log.data,
  });

  return {
    eventName: parsed.name,
    topic0: TOPIC0,
    poolId: parsed.args.id,
    currency0: parsed.args.currency0,
    currency1: parsed.args.currency1,
    fee: parsed.args.fee.toString(),
    tickSpacing: parsed.args.tickSpacing.toString(),
    hooks: parsed.args.hooks,
    sqrtPriceX96: parsed.args.sqrtPriceX96.toString(),
    tick: parsed.args.tick.toString(),
  };
}

module.exports = {
  INITIALIZE_ABI,
  TOPIC0,
  decodeInitializeLog,
};
