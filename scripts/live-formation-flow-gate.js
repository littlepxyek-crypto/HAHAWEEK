'use strict';

const { ethers } = require('ethers');

const { createProvider } = require('../src/core/rpc');
const { CHAIN_ID, CONFIRMATIONS } = require('../src/core/config');

const { discoverPool } =
  require('../src/core/pool-discovery');

const { createFormationEvent } =
  require('../src/core/formation-event');

const {
  createFormationTimeline,
  appendTimelineEvent,
} =
  require('../src/core/formation-timeline');

const {
  MODIFY_LIQUIDITY_TOPIC0,
  createLiquidityEvent,
} =
  require('../src/core/liquidity-event');

const {
  SWAP_TOPIC0,
  createSwapEvent,
} =
  require('../src/core/swap-event');

const POOL_MANAGER =
  '0x8366a39cc670b4001a1121b8f6a443a643e40951';

const INIT_ABI = [
  'event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)'
];

const LIQUIDITY_ABI = [
  'event ModifyLiquidity(bytes32 indexed id,address indexed sender,int24 tickLower,int24 tickUpper,int256 liquidityDelta,bytes32 salt)'
];

const SWAP_ABI = [
  'event Swap(bytes32 indexed id,address indexed sender,int128 amount0,int128 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick,uint24 fee)'
];

const initIface =
  new ethers.Interface(INIT_ABI);

const liquidityIface =
  new ethers.Interface(LIQUIDITY_ABI);

const swapIface =
  new ethers.Interface(SWAP_ABI);

const INIT_TOPIC0 =
  initIface.getEvent('Initialize').topicHash;

async function main() {
  const provider = createProvider();

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
      Math.max(0, safeHead - 1000);

    console.log(
      '=== LIVE FORMATION FLOW GATE ==='
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
     * 1. Find live Initialize events.
     */
    const initializeLogs =
      await provider.getLogs({
        address: POOL_MANAGER,
        topics: [INIT_TOPIC0],
        fromBlock,
        toBlock: safeHead,
      });

    console.log(
      `Initialize logs: ${initializeLogs.length}`
    );

    if (initializeLogs.length === 0) {
      throw new Error(
        'NO_INITIALIZE_LOGS_FOUND'
      );
    }

    /*
     * 2. Build pool registry from Initialize.
     */
    const pools = new Map();

    for (const log of initializeLogs) {
      const pool =
        discoverPool(log);

      pools.set(
        pool.poolId.toLowerCase(),
        {
          pool,
          initializeLog: log,
        }
      );
    }

    /*
     * 3. Fetch liquidity events.
     */
    const liquidityLogs =
      await provider.getLogs({
        address: POOL_MANAGER,
        topics: [MODIFY_LIQUIDITY_TOPIC0],
        fromBlock,
        toBlock: safeHead,
      });

    console.log(
      `ModifyLiquidity logs: ${liquidityLogs.length}`
    );

    /*
     * 4. Fetch swap events.
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

    if (liquidityLogs.length === 0) {
      throw new Error(
        'NO_LIQUIDITY_LOGS_FOUND'
      );
    }

    if (swapLogs.length === 0) {
      throw new Error(
        'NO_SWAP_LOGS_FOUND'
      );
    }

    /*
     * 5. Find a pool with both liquidity + swap.
     */
    let candidate = null;

    for (
      let i = liquidityLogs.length - 1;
      i >= 0;
      i--
    ) {
      const liquidityLog =
        liquidityLogs[i];

      const parsedLiquidity =
        liquidityIface.parseLog({
          topics: liquidityLog.topics,
          data: liquidityLog.data,
        });

      if (!parsedLiquidity) continue;

      const poolId =
        parsedLiquidity.args.id.toLowerCase();

      const registryEntry =
        pools.get(poolId);

      if (!registryEntry) continue;

      const pool =
        registryEntry.pool;

      /*
       * Find a Swap for the same pool
       * after the liquidity event.
       */
      for (
        let j = swapLogs.length - 1;
        j >= 0;
        j--
      ) {
        const swapLog =
          swapLogs[j];

        const parsedSwap =
          swapIface.parseLog({
            topics: swapLog.topics,
            data: swapLog.data,
          });

        if (!parsedSwap) continue;

        const swapPoolId =
          parsedSwap.args.id.toLowerCase();

        if (
          swapPoolId !==
          poolId
        ) {
          continue;
        }

        if (
          swapLog.blockNumber <
          liquidityLog.blockNumber
        ) {
          continue;
        }

        candidate = {
          pool,
          initializeLog:
            registryEntry.initializeLog,
          liquidityLog,
          swapLog,
        };

        break;
      }

      if (candidate) break;
    }

    if (!candidate) {
      throw new Error(
        'NO_COMPLETE_FORMATION_FLOW_FOUND'
      );
    }

    const {
      pool,
      initializeLog,
      liquidityLog,
      swapLog,
    } = candidate;

    /*
     * 6. Decode all three layers.
     */
    const formation =
      createFormationEvent(pool);

    const liquidity =
      createLiquidityEvent(
        liquidityLog,
        pool
      );

    const swap =
      createSwapEvent(
        swapLog,
        pool
      );

    /*
     * 7. Build immutable timeline.
     */
    let timeline =
      createFormationTimeline(
        formation
      );

    timeline =
      appendTimelineEvent(
        timeline,
        liquidity
      );

    timeline =
      appendTimelineEvent(
        timeline,
        swap
      );

    /*
     * 8. Print evidence.
     */
    console.log(
      '\n=== INITIALIZE ==='
    );

    console.log(
      `Block: ${initializeLog.blockNumber}`
    );

    console.log(
      `Pool ID: ${formation.poolId}`
    );

    console.log(
      `Identity: ${formation.eventId}`
    );

    console.log(
      '\n=== LIQUIDITY ==='
    );

    console.log(
      `Block: ${liquidity.blockNumber}`
    );

    console.log(
      `Pool ID: ${liquidity.poolId}`
    );

    console.log(
      `Identity: ${liquidity.identity}`
    );

    console.log(
      `Liquidity delta: ${liquidity.liquidityDelta}`
    );

    console.log(
      '\n=== SWAP ==='
    );

    console.log(
      `Block: ${swap.blockNumber}`
    );

    console.log(
      `Pool ID: ${swap.poolId}`
    );

    console.log(
      `Identity: ${swap.identity}`
    );

    console.log(
      `Amount0: ${swap.amount0}`
    );

    console.log(
      `Amount1: ${swap.amount1}`
    );

    console.log(
      '\n=== TIMELINE ==='
    );

    for (const event of timeline.events) {
      console.log(
        `${event.sequence}: ${event.eventType} @ block ${event.blockNumber}`
      );
    }

    /*
     * 9. Hard cross-layer assertions.
     */
    if (
      formation.chainId !== CHAIN_ID ||
      liquidity.chainId !== CHAIN_ID ||
      swap.chainId !== CHAIN_ID
    ) {
      throw new Error(
        'CROSS_LAYER_CHAIN_ID_FAILURE'
      );
    }

    if (
      formation.poolId !== liquidity.poolId ||
      formation.poolId !== swap.poolId
    ) {
      throw new Error(
        'CROSS_LAYER_POOL_ID_FAILURE'
      );
    }

    if (
      initializeLog.blockNumber >
      liquidity.blockNumber
    ) {
      throw new Error(
        'INITIALIZE_LIQUIDITY_ORDER_FAILURE'
      );
    }

    if (
      liquidity.blockNumber >
      swap.blockNumber
    ) {
      throw new Error(
        'LIQUIDITY_SWAP_ORDER_FAILURE'
      );
    }

    if (timeline.events.length !== 3) {
      throw new Error(
        'TIMELINE_LENGTH_FAILURE'
      );
    }

    console.log(
      '\nLIVE INITIALIZE -> LIQUIDITY -> SWAP: OK'
    );

    console.log(
      'END-TO-END FORMATION/FLOW: OK'
    );
  } finally {
    provider.destroy();
  }
}

main().catch((error) => {
  console.error(
    '\nLIVE FORMATION FLOW: FAILED'
  );

  console.error(
    error.message
  );

  process.exitCode = 1;
});
