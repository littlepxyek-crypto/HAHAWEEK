'use strict';

/*
 * Deterministic aggregation of normalized SWAP events.
 *
 * This layer intentionally does NOT:
 * - classify BUY / SELL
 * - calculate price
 * - calculate momentum
 * - produce scores
 * - make predictions
 *
 * amount0 / amount1 remain raw signed PoolManager deltas.
 */

function aggregateSwapFlow(events) {
  if (!Array.isArray(events)) {
    throw new Error('SWAP_EVENTS_REQUIRED');
  }

  if (events.length === 0) {
    throw new Error('SWAP_EVENTS_EMPTY');
  }

  const first = events[0];

  if (
    !first ||
    !Number.isInteger(first.chainId) ||
    first.chainId <= 0
  ) {
    throw new Error('INVALID_CHAIN_ID');
  }

  if (
    typeof first.poolId !== 'string' ||
    !first.poolId
  ) {
    throw new Error('INVALID_POOL_ID');
  }

  const chainId = first.chainId;
  const poolId = first.poolId.toLowerCase();

  let totalAmount0 = 0n;
  let totalAmount1 = 0n;

  let positiveAmount0 = 0;
  let negativeAmount0 = 0;
  let zeroAmount0 = 0;

  let positiveAmount1 = 0;
  let negativeAmount1 = 0;
  let zeroAmount1 = 0;

  const senders = new Set();

  let firstBlock = null;
  let lastBlock = null;

  for (const event of events) {
    if (!event || typeof event !== 'object') {
      throw new Error('INVALID_SWAP_EVENT');
    }

    if (event.eventType !== 'SWAP') {
      throw new Error('INVALID_SWAP_EVENT_TYPE');
    }

    if (event.chainId !== chainId) {
      throw new Error('CHAIN_ID_MISMATCH');
    }

    if (
      typeof event.poolId !== 'string' ||
      event.poolId.toLowerCase() !== poolId
    ) {
      throw new Error('POOL_ID_MISMATCH');
    }

    if (
      typeof event.amount0 !== 'string' ||
      typeof event.amount1 !== 'string'
    ) {
      throw new Error('INVALID_SWAP_AMOUNT');
    }

    if (
      !Number.isInteger(event.blockNumber) ||
      event.blockNumber < 0
    ) {
      throw new Error('INVALID_BLOCK_NUMBER');
    }

    totalAmount0 += BigInt(event.amount0);
    totalAmount1 += BigInt(event.amount1);

    const amount0 = BigInt(event.amount0);
    const amount1 = BigInt(event.amount1);

    if (amount0 > 0n) {
      positiveAmount0 += 1;
    } else if (amount0 < 0n) {
      negativeAmount0 += 1;
    } else {
      zeroAmount0 += 1;
    }

    if (amount1 > 0n) {
      positiveAmount1 += 1;
    } else if (amount1 < 0n) {
      negativeAmount1 += 1;
    } else {
      zeroAmount1 += 1;
    }

    if (typeof event.sender === 'string') {
      senders.add(event.sender.toLowerCase());
    }

    if (
      firstBlock === null ||
      event.blockNumber < firstBlock
    ) {
      firstBlock = event.blockNumber;
    }

    if (
      lastBlock === null ||
      event.blockNumber > lastBlock
    ) {
      lastBlock = event.blockNumber;
    }
  }

  return {
    version: 1,
    aggregationType: 'SWAP_FLOW',

    chainId,
    poolId,

    swapCount: events.length,
    uniqueSenderCount: senders.size,

    totalAmount0: totalAmount0.toString(),
    totalAmount1: totalAmount1.toString(),

    amount0DirectionCounts: {
      positive: positiveAmount0,
      negative: negativeAmount0,
      zero: zeroAmount0,
    },

    amount1DirectionCounts: {
      positive: positiveAmount1,
      negative: negativeAmount1,
      zero: zeroAmount1,
    },

    firstBlock,
    lastBlock,
  };
}

module.exports = {
  aggregateSwapFlow,
};
