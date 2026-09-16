'use strict';

/*
 * Deterministic time-window aggregation.
 *
 * Input events must contain:
 * - eventType: SWAP
 * - chainId
 * - poolId
 * - blockNumber
 * - timestamp: Unix seconds
 * - amount0
 * - amount1
 * - sender
 *
 * This layer does NOT:
 * - classify BUY / SELL
 * - calculate momentum
 * - create scores
 * - predict outcomes
 */

function floorWindow(timestamp, windowSeconds) {
  return Math.floor(timestamp / windowSeconds) * windowSeconds;
}

function aggregateFlowWindows(
  events,
  windowSeconds
) {
  if (!Array.isArray(events)) {
    throw new Error('SWAP_EVENTS_REQUIRED');
  }

  if (events.length === 0) {
    throw new Error('SWAP_EVENTS_EMPTY');
  }

  if (
    !Number.isInteger(windowSeconds) ||
    windowSeconds <= 0
  ) {
    throw new Error('INVALID_WINDOW_SECONDS');
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

  const windows = new Map();

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
      event.poolId.toLowerCase() !== poolId
    ) {
      throw new Error('POOL_ID_MISMATCH');
    }

    if (
      !Number.isInteger(event.timestamp) ||
      event.timestamp < 0
    ) {
      throw new Error('INVALID_TIMESTAMP');
    }

    const windowStart =
      floorWindow(
        event.timestamp,
        windowSeconds
      );

    let bucket = windows.get(windowStart);

    if (!bucket) {
      bucket = {
        windowStart,
        windowEnd:
          windowStart + windowSeconds,

        chainId,
        poolId,

        swapCount: 0,
        uniqueSenderCount: 0,

        totalAmount0: 0n,
        totalAmount1: 0n,

        senders: new Set(),

        firstBlock: event.blockNumber,
        lastBlock: event.blockNumber,

        firstTimestamp: event.timestamp,
        lastTimestamp: event.timestamp,
      };

      windows.set(
        windowStart,
        bucket
      );
    }

    bucket.swapCount += 1;

    bucket.totalAmount0 +=
      BigInt(event.amount0);

    bucket.totalAmount1 +=
      BigInt(event.amount1);

    if (typeof event.sender === 'string') {
      bucket.senders.add(
        event.sender.toLowerCase()
      );
    }

    if (
      event.blockNumber <
      bucket.firstBlock
    ) {
      bucket.firstBlock =
        event.blockNumber;
    }

    if (
      event.blockNumber >
      bucket.lastBlock
    ) {
      bucket.lastBlock =
        event.blockNumber;
    }

    if (
      event.timestamp <
      bucket.firstTimestamp
    ) {
      bucket.firstTimestamp =
        event.timestamp;
    }

    if (
      event.timestamp >
      bucket.lastTimestamp
    ) {
      bucket.lastTimestamp =
        event.timestamp;
    }
  }

  return [...windows.values()]
    .sort(
      (a, b) =>
        a.windowStart -
        b.windowStart
    )
    .map(bucket => ({
      windowStart: bucket.windowStart,
      windowEnd: bucket.windowEnd,

      chainId: bucket.chainId,
      poolId: bucket.poolId,

      swapCount: bucket.swapCount,
      uniqueSenderCount:
        bucket.senders.size,

      totalAmount0:
        bucket.totalAmount0.toString(),

      totalAmount1:
        bucket.totalAmount1.toString(),

      firstBlock: bucket.firstBlock,
      lastBlock: bucket.lastBlock,

      firstTimestamp:
        bucket.firstTimestamp,

      lastTimestamp:
        bucket.lastTimestamp,
    }));
}

module.exports = {
  floorWindow,
  aggregateFlowWindows,
};
