'use strict';

const { ethers } = require('ethers');

const { createProvider } = require('../src/core/rpc');
const { CHAIN_ID, CONFIRMATIONS } = require('../src/core/config');
const { discoverPool } = require('../src/core/pool-discovery');
const {
  SWAP_TOPIC0,
  createSwapEvent,
} = require('../src/core/swap-event');

const POOL_MANAGER =
  '0x8366a39cc670b4001a1121b8f6a443a643e40951';

const INIT_ABI = [
  'event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)'
];

const SWAP_ABI = [
  'event Swap(bytes32 indexed id,address indexed sender,int128 amount0,int128 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick,uint24 fee)'
];

const initIface = new ethers.Interface(INIT_ABI);
const swapIface = new ethers.Interface(SWAP_ABI);

const INIT_TOPIC0 =
  initIface.getEvent('Initialize').topicHash;

async function findInitialization(provider, poolId, safeHead) {
  // First try the complete available chain range.
  // The poolId is indexed, so this is much more efficient
  // than scanning every Initialize event manually.
  try {
    const logs = await provider.getLogs({
      address: POOL_MANAGER,
      topics: [INIT_TOPIC0, poolId],
      fromBlock: 0,
      toBlock: safeHead,
    });

    if (logs.length > 0) {
      return logs[0];
    }
  } catch (error) {
    console.log(
      `Full-range Initialize query unavailable: ${error.message}`
    );
  }

  // Fallback: progressively larger windows.
  const windows = [
    100_000,
    500_000,
    1_000_000,
    2_000_000,
    5_000_000,
  ];

  for (const window of windows) {
    const fromBlock = Math.max(
      0,
      safeHead - window
    );

    console.log(
      `Initialize fallback: ${fromBlock} -> ${safeHead}`
    );

    try {
      const logs = await provider.getLogs({
        address: POOL_MANAGER,
        topics: [INIT_TOPIC0, poolId],
        fromBlock,
        toBlock: safeHead,
      });

      if (logs.length > 0) {
        return logs[0];
      }
    } catch (error) {
      console.log(
        `Window ${window} failed: ${error.message}`
      );
    }
  }

  return null;
}

async function main() {
  const provider = createProvider();

  try {
    const network = await provider.getNetwork();
    const actualChainId = Number(network.chainId);

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

    const toBlock =
      safeHead;

    console.log('=== LIVE SWAP GATE ===');
    console.log(`Chain ID: ${actualChainId}`);
    console.log(`PoolManager: ${POOL_MANAGER}`);
    console.log(`Initialize topic0: ${INIT_TOPIC0}`);
    console.log(`Swap topic0: ${SWAP_TOPIC0}`);
    console.log(`Swap window: ${fromBlock} -> ${toBlock}`);

    const swapLogs =
      await provider.getLogs({
        address: POOL_MANAGER,
        topics: [SWAP_TOPIC0],
        fromBlock,
        toBlock,
      });

    console.log(`Swap logs: ${swapLogs.length}`);

    if (swapLogs.length === 0) {
      throw new Error(
        'NO_LIVE_SWAP_LOGS_FOUND'
      );
    }

    // Use the newest valid Swap as the live candidate.
    let swapLog = null;
    let parsedSwap = null;

    for (let i = swapLogs.length - 1; i >= 0; i--) {
      const parsed =
        swapIface.parseLog({
          topics: swapLogs[i].topics,
          data: swapLogs[i].data,
        });

      if (!parsed) continue;

      swapLog = swapLogs[i];
      parsedSwap = parsed;
      break;
    }

    if (!swapLog || !parsedSwap) {
      throw new Error(
        'SWAP_ABI_DECODE_FAILED'
      );
    }

    const poolId =
      parsedSwap.args.id.toLowerCase();

    console.log(
      `\nCandidate Swap pool: ${poolId}`
    );

    console.log(
      'Searching indexed Initialize by Pool ID...'
    );

    const initializeLog =
      await findInitialization(
        provider,
        poolId,
        safeHead
      );

    if (!initializeLog) {
      throw new Error(
        'POOL_INITIALIZATION_NOT_FOUND'
      );
    }

    const pool =
      discoverPool(initializeLog);

    console.log('\n=== INITIALIZE ===');
    console.log(
      `Block: ${initializeLog.blockNumber}`
    );
    console.log(
      `Transaction: ${initializeLog.transactionHash}`
    );
    console.log(
      `Pool ID: ${pool.poolId}`
    );
    console.log(
      `Pool identity: ${pool.identity}`
    );

    console.log('\n=== RAW SWAP ===');
    console.log(
      `Block: ${swapLog.blockNumber}`
    );
    console.log(
      `Transaction: ${swapLog.transactionHash}`
    );
    console.log(
      `Log index: ${swapLog.index ?? swapLog.logIndex}`
    );
    console.log(
      `Topics: ${swapLog.topics.length}`
    );
    console.log(
      `Data chars: ${swapLog.data.length}`
    );

    const event =
      createSwapEvent(
        swapLog,
        pool
      );

    console.log('\n=== DECODED ===');
    console.log(`Pool ID: ${event.poolId}`);
    console.log(`Sender: ${event.sender}`);
    console.log(`Amount0: ${event.amount0}`);
    console.log(`Amount1: ${event.amount1}`);
    console.log(`SqrtPriceX96: ${event.sqrtPriceX96}`);
    console.log(`Liquidity: ${event.liquidity}`);
    console.log(`Tick: ${event.tick}`);
    console.log(`Fee: ${event.fee}`);

    console.log('\n=== CROSS-LAYER ===');
    console.log(`Chain ID: ${event.chainId}`);
    console.log(`PoolManager: ${event.poolManager}`);
    console.log(`Pool identity: ${pool.identity}`);
    console.log(`Event identity: ${event.identity}`);

    if (event.chainId !== CHAIN_ID) {
      throw new Error(
        'SWAP_CHAIN_ID_MISMATCH'
      );
    }

    if (
      event.poolManager !==
      POOL_MANAGER.toLowerCase()
    ) {
      throw new Error(
        'SWAP_POOL_MANAGER_MISMATCH'
      );
    }

    if (
      event.poolId !==
      pool.poolId.toLowerCase()
    ) {
      throw new Error(
        'SWAP_POOL_ID_MISMATCH'
      );
    }

    console.log(
      '\nRAW -> ABI DECODE -> HISTORICAL INITIALIZE -> POOL ID -> POOL IDENTITY -> FLOW EVENT: OK'
    );

    console.log('LIVE SWAP: OK');
  } finally {
    provider.destroy();
  }
}

main().catch((error) => {
  console.error('\nLIVE SWAP: FAILED');
  console.error(error.message);
  process.exitCode = 1;
});
