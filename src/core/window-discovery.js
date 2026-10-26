'use strict';

/*
 * Window-watch stage 1: pool discovery.
 *
 * Topic-filtered eth_getLogs for the PoolManager Initialize event ONLY, in
 * large chunks (default 100k blocks; probe 2026-10-26: 1M blocks ~1.9 s,
 * ~5,300 logs). When the RPC answers "logs matched by query exceeds limit of
 * 10000" the chunk is halved and the same start block is retried, down to a
 * minimum chunk size.
 *
 * Discovery is contiguous: `scannedThrough` only advances over chunks that
 * completed, so there are never holes in the discovery range. Discovery
 * results are planning input; they are not evidence. The Initialize logs that
 * matter are ingested again, as evidence, by stage 2 through the verified
 * processing context and the authority gate.
 */

const { rpcCall } = require('./rpc-call');
const { POOL_MANAGER } = require('./pool-discovery');
const { TOPIC0: INITIALIZE_TOPIC0 } = require('./initialize-decoder');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function isLogLimitError(error) {
  const parts = [];
  let current = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    parts.push(current.message, current.shortMessage, current.error && current.error.message,
      current.info && current.info.error && current.info.error.message);
    current = current.cause;
  }
  const text = parts.filter(Boolean).join(' ').toLowerCase();
  return /exceeds? (the )?limit|query returned more than|too many (logs|results)|response size exceeded|block range (is )?too (large|wide)/.test(text);
}

function createInitializeFilter() {
  return { address: POOL_MANAGER, topics: [INITIALIZE_TOPIC0] };
}

function toPool(log) {
  const blockNumber = Number(log.blockNumber);
  if (!Number.isSafeInteger(blockNumber)) fail('WINDOW_DISCOVERY_LOG_INVALID');
  return {
    blockNumber,
    poolId: Array.isArray(log.topics) ? log.topics[1] : null,
    transactionHash: log.transactionHash,
  };
}

/*
 * Scan [fromBlock, min(toBlock, fromBlock + maxBlocks - 1)].
 * Returns { fromBlock, scannedThrough (null if nothing completed), pools,
 * requests, halvings, chunkBlocks, error }. A non-limit RPC error stops the
 * scan; what completed before it is still returned (contiguous) together with
 * `error`, so the caller can persist progress and decide.
 */
async function discoverInitializations({
  provider,
  fromBlock,
  toBlock,
  chunkBlocks = 100000,
  minChunkBlocks = 1000,
  maxBlocks = 1000000,
  budget,
  filter = createInitializeFilter(),
}) {
  if (!provider || typeof provider.getLogs !== 'function') fail('WINDOW_DISCOVERY_PROVIDER_REQUIRED');
  for (const [value, code] of [[fromBlock, 'WINDOW_DISCOVERY_FROM_INVALID'], [toBlock, 'WINDOW_DISCOVERY_TO_INVALID']]) {
    if (!Number.isSafeInteger(value) || value < 0) fail(code);
  }
  if (!Number.isSafeInteger(chunkBlocks) || chunkBlocks < 1) fail('WINDOW_DISCOVERY_CHUNK_INVALID');
  if (!Number.isSafeInteger(minChunkBlocks) || minChunkBlocks < 1 || minChunkBlocks > chunkBlocks) {
    fail('WINDOW_DISCOVERY_MIN_CHUNK_INVALID');
  }
  if (!Number.isSafeInteger(maxBlocks) || maxBlocks < 1) fail('WINDOW_DISCOVERY_MAX_BLOCKS_INVALID');

  const result = {
    fromBlock,
    scannedThrough: null,
    pools: [],
    requests: 0,
    halvings: 0,
    chunkBlocks,
    error: null,
  };
  if (toBlock < fromBlock) return result;

  const end = Math.min(toBlock, fromBlock + maxBlocks - 1);
  let chunk = chunkBlocks;
  let start = fromBlock;
  while (start <= end) {
    const stop = Math.min(end, start + chunk - 1);
    let logs;
    try {
      result.requests += 1;
      logs = await rpcCall(
        () => provider.getLogs({ ...filter, fromBlock: start, toBlock: stop }),
        { budget, maxAttempts: 1 }
      );
    } catch (error) {
      if (isLogLimitError(error) && chunk > minChunkBlocks) {
        chunk = Math.max(minChunkBlocks, Math.floor(chunk / 2));
        result.halvings += 1;
        continue;
      }
      result.error = error;
      break;
    }
    for (const log of logs) {
      const pool = toPool(log);
      if (pool.blockNumber < start || pool.blockNumber > stop) fail('WINDOW_DISCOVERY_LOG_OUT_OF_RANGE');
      result.pools.push(pool);
    }
    result.scannedThrough = stop;
    start = stop + 1;
  }
  result.chunkBlocks = chunk;
  return result;
}

module.exports = {
  createInitializeFilter,
  discoverInitializations,
  isLogLimitError,
};
