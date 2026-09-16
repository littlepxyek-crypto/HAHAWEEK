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
        safeHead - 5000
      );

    console.log(
      '=== LIVE MULTI-WINDOW FLOW GATE ==='
    );

    console.log(
      `Chain ID: ${actualChainId}`
    );

    console.log(
      `Window: ${fromBlock} -> ${safeHead}`
    );

    /*
     * Robinhood RPC limits eth_getLogs results.
     * Never request the complete historical window
     * in one call.
     */
    const LOG_CHUNK = 50;
    const swapLogs = [];

    for (
      let start = fromBlock;
      start <= safeHead;
      start += LOG_CHUNK
    ) {
      const end = Math.min(
        start + LOG_CHUNK - 1,
        safeHead
      );

      const logs =
        await provider.getLogs({
          address: POOL_MANAGER,
          topics: [SWAP_TOPIC0],
          fromBlock: start,
          toBlock: end,
        });

      swapLogs.push(...logs);

      console.log(
        `Swap scan ${start} -> ${end}: ${logs.length}`
      );
    }

    console.log(
      `Swap logs: ${swapLogs.length}`
    );

    if (swapLogs.length < 2) {
      throw new Error(
        'INSUFFICIENT_SWAP_LOGS'
      );
    }

    /*
     * Formation-first candidate selection.
     *
     * IMPORTANT:
     * A formation/flow gate must start from pools that
     * were actually initialized inside the observation
     * window. We must NOT select an arbitrary active pool
     * from Swap history and then search for its genesis.
     */

    const initializeLogs =
      await provider.getLogs({
        address: POOL_MANAGER,
        topics: [INIT_TOPIC0],
        fromBlock,
        toBlock: safeHead,
      });

    console.log(
      `Initialize logs in window: ${initializeLogs.length}`
    );

    if (initializeLogs.length === 0) {
      throw new Error(
        'NO_INITIALIZE_LOGS_IN_WINDOW'
      );
    }

    const initializedPools =
      new Map();

    for (const log of initializeLogs) {
      const pool =
        discoverPool(log);

      initializedPools.set(
        pool.poolId.toLowerCase(),
        {
          pool,
          initializeLog: log,
        }
      );
    }

    console.log(
      `Initialized candidate pools: ${initializedPools.size}`
    );

    /*
     * Count Swap events only for pools that were
     * initialized in the same observation window.
     */
    const candidateCounts =
      new Map();

    for (const log of swapLogs) {
      const parsed =
        swapIface.parseLog({
          topics: log.topics,
          data: log.data,
        });

      if (!parsed) continue;

      const poolId =
        parsed.args.id.toLowerCase();

      if (!initializedPools.has(poolId)) {
        continue;
      }

      const entry =
        candidateCounts.get(poolId) || {
          swapCount: 0,
        };

      entry.swapCount += 1;

      candidateCounts.set(
        poolId,
        entry
      );
    }

    const rankedCandidates =
      [...candidateCounts.entries()]
        .sort(
          (a, b) =>
            b[1].swapCount -
            a[1].swapCount
        );

    if (
      rankedCandidates.length === 0
    ) {
      throw new Error(
        'NO_INITIALIZED_POOL_WITH_SWAP'
      );
    }

    const targetPool =
      rankedCandidates[0][0];

    const registryEntry =
      initializedPools.get(
        targetPool
      );

    const pool =
      registryEntry.pool;

    const initializeLog =
      registryEntry.initializeLog;

    console.log(
      `Target pool: ${targetPool}`
    );

    console.log(
      `Pool swap count: ${rankedCandidates[0][1].swapCount}`
    );

    console.log(
      `Target Initialize block: ${initializeLog.blockNumber}`
    );

    /*
     * Normalize swaps for the selected
     * formation-first candidate.
     */

    /*
     * Normalize swaps and retrieve
     * blockchain timestamps.
     */
    const events = [];

    for (const log of swapLogs) {
      const parsed =
        swapIface.parseLog({
          topics: log.topics,
          data: log.data,
        });

      if (!parsed) continue;

      if (
        parsed.args.id.toLowerCase() !==
        targetPool
      ) {
        continue;
      }

      const event =
        createSwapEvent(
          log,
          pool
        );

      const block =
        await provider.getBlock(
          log.blockNumber
        );

      if (!block) {
        throw new Error(
          `BLOCK_NOT_FOUND: ${log.blockNumber}`
        );
      }

      events.push({
        ...event,
        timestamp:
          block.timestamp,
      });
    }

    if (events.length < 2) {
      throw new Error(
        'INSUFFICIENT_TIMESTAMPED_EVENTS'
      );
    }

    /*
     * Sort chronologically.
     */
    events.sort(
      (a, b) =>
        a.timestamp - b.timestamp
    );

    console.log(
      `Timestamped target-pool swaps: ${events.length}`
    );

    /*
     * Aggregate 5-minute windows.
     */
    const windows =
      aggregateFlowWindows(
        events,
        300
      );

    console.log(
      `5-minute windows: ${windows.length}`
    );

    if (windows.length < 2) {
      console.log(
        '\nNOTE: pool has multiple swaps but they fall inside one 5-minute window.'
      );

      console.log(
        'The pipeline is valid, but multiple-window historical variation is not yet observed in this sample.'
      );
    }

    console.log(
      '\n=== SAMPLE EVENTS ==='
    );

    for (
      const event of events.slice(0, 5)
    ) {
      console.log(
        `Block ${event.blockNumber} | timestamp ${event.timestamp} | amount0 ${event.amount0} | amount1 ${event.amount1}`
      );
    }

    console.log(
      '\n=== FLOW WINDOWS ==='
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
     * Provenance verification.
     */
    for (const event of events) {
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
      events.some(
        event =>
          event.poolId !== targetPool
      )
    ) {
      throw new Error(
        'POOL_ISOLATION_FAILURE'
      );
    }

    if (windows.length === 0) {
      throw new Error(
        'NO_WINDOWS_CREATED'
      );
    }

    console.log(
      '\nMULTI-EVENT BLOCK TIMESTAMP PROVENANCE: OK'
    );

    console.log(
      'LIVE MULTI-WINDOW FLOW: OK'
    );
  } finally {
    provider.destroy();
  }
}

main().catch(error => {
  console.error(
    '\nLIVE MULTI-WINDOW FLOW: FAILED'
  );

  console.error(
    error.message
  );

  process.exitCode = 1;
});
