'use strict';

const { ethers } = require('ethers');

const { createProvider } = require('../src/core/rpc');
const { CHAIN_ID, CONFIRMATIONS } = require('../src/core/config');
const { discoverPool } = require('../src/core/pool-discovery');
const {
  MODIFY_LIQUIDITY_TOPIC0,
  createLiquidityEvent,
} = require('../src/core/liquidity-event');

const POOL_MANAGER =
  '0x8366a39cc670b4001a1121b8f6a443a643e40951';

const INIT_ABI = [
  'event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)'
];

const MODIFY_ABI = [
  'event ModifyLiquidity(bytes32 indexed id,address indexed sender,int24 tickLower,int24 tickUpper,int256 liquidityDelta,bytes32 salt)'
];

const initIface = new ethers.Interface(INIT_ABI);
const modifyIface = new ethers.Interface(MODIFY_ABI);

const INITIALIZE_TOPIC0 =
  initIface.getEvent('Initialize').topicHash;

const SCAN_BLOCKS = Number(
  process.env.LIQUIDITY_GATE_BLOCKS || 1000
);

const CHUNK_SIZE = Number(
  process.env.LIQUIDITY_GATE_CHUNK || 100
);

async function getLogsChunked(provider, topic0, fromBlock, toBlock) {
  const logs = [];

  for (
    let start = fromBlock;
    start <= toBlock;
    start += CHUNK_SIZE
  ) {
    const end = Math.min(
      start + CHUNK_SIZE - 1,
      toBlock
    );

    const batch = await provider.getLogs({
      address: POOL_MANAGER,
      topics: [topic0],
      fromBlock: start,
      toBlock: end,
    });

    logs.push(...batch);
  }

  return logs;
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

    const latestBlock = await provider.getBlockNumber();
    const safeHead = latestBlock - CONFIRMATIONS;

    const fromBlock = Math.max(
      0,
      safeHead - SCAN_BLOCKS + 1
    );

    console.log('=== LIVE MODIFYLIQUIDITY GATE ===');
    console.log(`Chain ID: ${actualChainId}`);
    console.log(`PoolManager: ${POOL_MANAGER}`);
    console.log(`Initialize topic0: ${INITIALIZE_TOPIC0}`);
    console.log(`ModifyLiquidity topic0: ${MODIFY_LIQUIDITY_TOPIC0}`);
    console.log(`Scanned: ${fromBlock} -> ${safeHead}`);

    const initializeLogs = await getLogsChunked(
      provider,
      INITIALIZE_TOPIC0,
      fromBlock,
      safeHead
    );

    const modifyLogs = await getLogsChunked(
      provider,
      MODIFY_LIQUIDITY_TOPIC0,
      fromBlock,
      safeHead
    );

    console.log(`Initialize logs: ${initializeLogs.length}`);
    console.log(`ModifyLiquidity logs: ${modifyLogs.length}`);

    if (initializeLogs.length === 0) {
      throw new Error('NO_INITIALIZE_LOGS_FOUND');
    }

    if (modifyLogs.length === 0) {
      throw new Error('NO_MODIFY_LIQUIDITY_LOGS_FOUND');
    }

    const pools = new Map();

    for (const log of initializeLogs) {
      const pool = discoverPool(log);

      pools.set(
        pool.poolId.toLowerCase(),
        pool
      );
    }

    let matched = null;

    for (const log of modifyLogs) {
      const parsed = modifyIface.parseLog({
        topics: log.topics,
        data: log.data,
      });

      if (!parsed) continue;

      const poolId = parsed.args.id.toLowerCase();
      const pool = pools.get(poolId);

      if (!pool) continue;

      matched = {
        log,
        pool,
      };

      break;
    }

    if (!matched) {
      throw new Error(
        'NO_MODIFY_LIQUIDITY_MATCHED_INITIALIZED_POOL'
      );
    }

    const event = createLiquidityEvent(
      matched.log,
      matched.pool
    );

    console.log('');
    console.log('=== RAW MODIFYLIQUIDITY ===');
    console.log(`Block: ${matched.log.blockNumber}`);
    console.log(`Transaction: ${matched.log.transactionHash}`);
    console.log(`Log index: ${matched.log.index}`);
    console.log(`Topics: ${matched.log.topics.length}`);
    console.log(`Data chars: ${matched.log.data.length}`);

    console.log('');
    console.log('=== DECODED ===');
    console.log(`Pool ID: ${event.poolId}`);
    console.log(`Sender: ${event.sender}`);
    console.log(`Tick lower: ${event.tickLower}`);
    console.log(`Tick upper: ${event.tickUpper}`);
    console.log(`Liquidity delta: ${event.liquidityDelta}`);
    console.log(`Salt: ${event.salt}`);

    console.log('');
    console.log('=== CROSS-LAYER ===');
    console.log(`Chain ID: ${event.chainId}`);
    console.log(`PoolManager: ${event.poolManager}`);
    console.log(`Pool identity: ${matched.pool.identity.canonicalId}`);
    console.log(`Event identity: ${event.identity}`);

    if (
      event.poolId.toLowerCase() !==
      matched.pool.poolId.toLowerCase()
    ) {
      throw new Error('POOL_ID_CROSS_LAYER_MISMATCH');
    }

    if (
      event.chainId !==
      matched.pool.chainId
    ) {
      throw new Error('CHAIN_ID_CROSS_LAYER_MISMATCH');
    }

    console.log('');
    console.log(
      'RAW -> ABI DECODE -> POOL ID -> POOL IDENTITY -> LIQUIDITY EVENT: OK'
    );
    console.log('LIVE MODIFYLIQUIDITY: OK');
  } finally {
    provider.destroy();
  }
}

main().catch((error) => {
  console.error('');
  console.error('LIVE MODIFYLIQUIDITY: FAILED');
  console.error(error.message);
  process.exitCode = 1;
});
