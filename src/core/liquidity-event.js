'use strict';

const { ethers } = require('ethers');

const MODIFY_LIQUIDITY_ABI = [
  'event ModifyLiquidity(bytes32 indexed id,address indexed sender,int24 tickLower,int24 tickUpper,int256 liquidityDelta,bytes32 salt)'
];

const iface = new ethers.Interface(MODIFY_LIQUIDITY_ABI);
const MODIFY_LIQUIDITY_TOPIC =
  iface.getEvent('ModifyLiquidity').topicHash;

function createLiquidityEvent(log, pool) {
  if (!log || !pool) {
    throw new Error('LIQUIDITY_EVENT_INPUT_REQUIRED');
  }

  if (log.address.toLowerCase() !== pool.poolManager.toLowerCase()) {
    throw new Error('POOL_MANAGER_MISMATCH');
  }

  if (!Array.isArray(log.topics) || log.topics.length !== 3) {
    throw new Error('INVALID_MODIFY_LIQUIDITY_TOPIC_COUNT');
  }

  if (log.topics[0].toLowerCase() !== MODIFY_LIQUIDITY_TOPIC.toLowerCase()) {
    throw new Error('INVALID_MODIFY_LIQUIDITY_TOPIC0');
  }

  if (typeof log.data !== 'string' || log.data.length !== 2 + 64 * 4) {
    throw new Error('INVALID_MODIFY_LIQUIDITY_DATA_LENGTH');
  }

  const parsed = iface.parseLog({
    topics: log.topics,
    data: log.data,
  });

  if (!parsed) {
    throw new Error('MODIFY_LIQUIDITY_DECODE_FAILED');
  }

  const poolId = parsed.args.id.toLowerCase();
  const sender = parsed.args.sender.toLowerCase();
  const tickLower = Number(parsed.args.tickLower);
  const tickUpper = Number(parsed.args.tickUpper);
  const liquidityDelta = parsed.args.liquidityDelta.toString();
  const salt = parsed.args.salt.toLowerCase();

  if (poolId !== pool.poolId.toLowerCase()) {
    throw new Error('POOL_ID_MISMATCH');
  }

  return {
    eventType: 'LIQUIDITY_MODIFIED',
    stage: 'FORMATION',

    chainId: pool.chainId,
    poolManager: pool.poolManager.toLowerCase(),
    poolId,

    sender,
    tickLower,
    tickUpper,
    liquidityDelta,
    salt,

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
  MODIFY_LIQUIDITY_TOPIC,
  createLiquidityEvent,
};
