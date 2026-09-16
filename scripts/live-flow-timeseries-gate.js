'use strict';

const { ethers } = require('ethers');

const { createProvider } =
  require('../src/core/rpc');

const {
  CHAIN_ID,
  CONFIRMATIONS,
} = require('../src/core/config');

const {
  SWAP_TOPIC0,
  createSwapEvent,
} = require('../src/core/swap-event');

const {
  aggregateFlowWindows,
} = require('../src/core/flow-time-series');

const {
  discoverPool,
} = require('../src/core/pool-discovery');

const POOL_MANAGER =
  '0x8366a39cc670b4001a1121b8f6a443a643e40951';

const INIT_ABI = [
  'event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)'
];

const SWAP_ABI = [
  'event Swap(bytes32 indexed id,address indexed sender,int128 amount0,int128 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick,uint24 fee)'
];

const initIface =
  new ethers.Interface(INIT_ABI);

const swapIface =
  new ethers.Interface(SWAP_ABI);

const INIT_TOPIC0 =
  initIface.getEvent('Initialize').topicHash;

async function main() {
  const provider =
    createProvider();

  try {
    const network =
      await provider.getNetwork();

    const actualChainId =
      Number(network.chainId);

    if (actualChainId !== CHAIN_ID) {
      throw new Error(
        `CHAIN_ID_MISMATCH: expected ${CHAIN_ID}, got ${actualChainId}`
      );
    }

    const latest =
      await provider.getBlockNumber();

    const safeHead =
      latest - CONFIRMATIONS;

    const fromBlock =
      Math.max(
        0,
        safeHead - 1000
      );

    console.log(
      '=== LIVE FLOW TIME-SERIES GATE ==='
    );

    console.log(
      `Chain ID: ${actualChainId}`
    );

    console.log(
      `PoolManager: ${POOL_MANAGER}`
    );

    console.log(
      `Window: ${fromBlock} -> ${safeHead}`
    );

    /*
     * Find recent Swap events.
     */
    const swapLogs =
      await provider.getLogs({
        address: POOL_MANAGER,
        topics: [SWAP_TOPIC0],
        fromBlock,
        toBlock: safeHead,
      });

    console.log(
      `Swap logs: ${swapLogs.length}`
    );

    if (swapLogs.length === 0) {
      throw new Error(
        'NO_SWAP_LOGS_FOUND'
      );
    }

    /*
     * Use several recent swaps so the
     * time-series has multiple observations.
     */
    const candidates = [];

    for (
      let i = swapLogs.length - 1;
      i >= 0 && candidates.length < 20;
      i--
    ) {
      const log =
        swapLogs[i];

      const parsed =
        swapIface.parseLog({
          topics: log.topics,
          data: log.data,
        });

      if (!parsed) continue;

      candidates.push({
        log,
        poolId:
          parsed.args.id.toLowerCase(),
      });
    }

    if (candidates.length === 0) {
      throw new Error(
        'NO_DECODABLE_SWAPS'
      );
    }

    /*
     * Build a pool registry efficiently.
     */
    const poolIds =
      [...new Set(
        candidates.map(
          item => item.poolId
        )
      )];

    console.log(
      `Unique candidate pools: ${poolIds.length}`
    );

    const pools =
      new Map();

    for (const poolId of poolIds) {
      const initializeLogs =
        await provider.getLogs({
          address: POOL_MANAGER,
          topics: [
            INIT_TOPIC0,
            poolId,
          ],
          fromBlock: 0,
          toBlock: safeHead,
        });

      if (
        initializeLogs.length === 0
      ) {
        continue;
      }

      const pool =
        discoverPool(
          initializeLogs[0]
        );

      pools.set(
        poolId,
        pool
      );
    }

    /*
     * Convert selected swaps into
     * normalized events with blockchain
     * timestamps.
     */
    const normalized = [];

    for (const candidate of candidates) {
      const pool =
        pools.get(
          candidate.poolId
        );

      if (!pool) continue;

      const event =
        createSwapEvent(
          candidate.log,
          pool
        );

      const block =
        await provider.getBlock(
          candidate.log.blockNumber
        );

      if (!block) {
        throw new Error(
          `BLOCK_NOT_FOUND: ${candidate.log.blockNumber}`
        );
      }

      if (
        !Number.isInteger(block.timestamp) ||
        block.timestamp < 0
      ) {
        throw new Error(
          'INVALID_BLOCK_TIMESTAMP'
        );
      }

      normalized.push({
        ...event,
        timestamp:
          block.timestamp,
      });
    }

    if (normalized.length === 0) {
      throw new Error(
        'NO_NORMALIZED_SWAPS'
      );
    }

    /*
     * Use one pool only for the
     * aggregation gate.
     */
    const targetPool =
      normalized[0].poolId;

    const poolEvents =
      normalized.filter(
        event =>
          event.poolId === targetPool
      );

    console.log(
      `Selected pool: ${targetPool}`
    );

    console.log(
      `Timestamped swaps: ${poolEvents.length}`
    );

    /*
     * Aggregate into 5-minute windows.
     */
    const windows =
      aggregateFlowWindows(
        poolEvents,
        300
      );

    console.log(
      '\n=== BLOCK TIMESTAMPS ==='
    );

    for (
      const event of poolEvents.slice(
        0,
        5
      )
    ) {
      console.log(
        `Block ${event.blockNumber} -> ${event.timestamp}`
      );
    }

    console.log(
      '\n=== 5-MINUTE FLOW WINDOWS ==='
    );

    for (const window of windows) {
      console.log(
        `Window ${window.windowStart} -> ${window.windowEnd}`
      );

      console.log(
        `  swaps: ${window.swapCount}`
      );

      console.log(
        `  unique senders: ${window.uniqueSenderCount}`
      );

      console.log(
        `  amount0: ${window.totalAmount0}`
      );

      console.log(
        `  amount1: ${window.totalAmount1}`
      );

      console.log(
        `  blocks: ${window.firstBlock} -> ${window.lastBlock}`
      );
    }

    /*
     * Hard validation.
     */
    for (const event of poolEvents) {
      const block =
        await provider.getBlock(
          event.blockNumber
        );

      if (
        !block ||
        block.timestamp !==
        event.timestamp
      ) {
        throw new Error(
          'TIMESTAMP_PROVENANCE_FAILURE'
        );
      }
    }

    if (
      windows.length === 0
    ) {
      throw new Error(
        'NO_TIME_WINDOWS_CREATED'
      );
    }

    console.log(
      '\nBLOCK -> TIMESTAMP -> SWAP -> 5M WINDOW: OK'
    );

    console.log(
      'LIVE FLOW TIME-SERIES: OK'
    );
  } finally {
    provider.destroy();
  }
}

main().catch(error => {
  console.error(
    '\nLIVE FLOW TIME-SERIES: FAILED'
  );

  console.error(
    error.message
  );

  process.exitCode = 1;
});
