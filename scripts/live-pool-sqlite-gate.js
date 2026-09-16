'use strict';

const { createProvider } = require('../src/core/rpc');
const { createDatabase } = require('../src/core/database');
const { createPoolStore } = require('../src/core/pool-store');
const { discoverPool } = require('../src/core/pool-discovery');
const { createFormationEvent } = require('../src/core/formation-event');
const { POOL_MANAGER } = require('../src/core/pool-discovery');
const { ethers } = require('ethers');

const INITIALIZE_ABI = [
  'event Initialize(bytes32 indexed id,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceX96,int24 tick)'
];

const initializeInterface = new ethers.Interface(INITIALIZE_ABI);
const INITIALIZE_TOPIC0 =
  initializeInterface.getEvent('Initialize').topicHash;

(async () => {
  const provider = createProvider();
  const database = await createDatabase();
  const store = createPoolStore(database.db);

  try {
    const latest = await provider.getBlockNumber();
    const confirmations = 3;

    const safeHead = latest - confirmations;
    const fromBlock = safeHead - 1000;
    const toBlock = safeHead;

    console.log('=== LIVE POOL → SQLITE GATE ===');
    console.log('Chain ID: 4663');
    console.log(`PoolManager: ${POOL_MANAGER}`);
    console.log(`Initialize topic0: ${INITIALIZE_TOPIC0}`);
    console.log(`Range: ${fromBlock} -> ${toBlock}`);

    let logs = [];

    for (
      let start = fromBlock;
      start <= toBlock;
      start += 100
    ) {
      const end = Math.min(start + 99, toBlock);

      const chunk = await provider.getLogs({
        address: POOL_MANAGER,
        topics: [INITIALIZE_TOPIC0],
        fromBlock: start,
        toBlock: end,
      });

      logs.push(...chunk);
    }

    console.log(`Initialize logs: ${logs.length}`);

    if (!logs.length) {
      throw new Error('NO_INITIALIZE_LOGS_FOUND');
    }

    const log = logs[logs.length - 1];

    const pool = discoverPool(log);
    const formation = createFormationEvent(pool);

    console.log('');
    console.log('=== LIVE POOL ===');
    console.log(`Pool ID: ${pool.poolId}`);
    console.log(`Currency0: ${pool.currency0}`);
    console.log(`Currency1: ${pool.currency1}`);
    console.log(`Fee: ${pool.fee}`);
    console.log(`Tick spacing: ${pool.tickSpacing}`);
    console.log(`Block: ${pool.blockNumber}`);
    console.log(`Transaction: ${pool.transactionHash}`);
    console.log(`Log index: ${pool.logIndex}`);

    const first = store.insert({
      poolId: formation.poolId,
      chainId: formation.chainId,
      poolManager: formation.poolManager,
      currency0: formation.currency0,
      currency1: formation.currency1,
      fee: formation.fee,
      tickSpacing: formation.tickSpacing,
      hooks: formation.hooks,
      blockNumber: formation.blockNumber,
      transactionHash: formation.transactionHash,
      logIndex: formation.logIndex,
      createdAt: new Date().toISOString(),
    });

    database.save();

    const second = store.insert({
      poolId: formation.poolId,
      chainId: formation.chainId,
      poolManager: formation.poolManager,
      currency0: formation.currency0,
      currency1: formation.currency1,
      fee: formation.fee,
      tickSpacing: formation.tickSpacing,
      hooks: formation.hooks,
      blockNumber: formation.blockNumber,
      transactionHash: formation.transactionHash,
      logIndex: formation.logIndex,
      createdAt: new Date().toISOString(),
    });

    database.save();

    console.log('');
    console.log('=== SQLITE INSERT ===');
    console.log(`First inserted: ${first.inserted}`);
    console.log(`Second inserted: ${second.inserted}`);
    console.log(`Pool count: ${store.count()}`);

    const restored = store.get(formation.poolId);

    if (!restored) {
      throw new Error('POOL_RELOAD_BEFORE_CLOSE_FAILED');
    }

    database.close();

    const reopened = await createDatabase();
    const reopenedStore = createPoolStore(reopened.db);
    const persisted = reopenedStore.get(formation.poolId);

    console.log('');
    console.log('=== RELOAD ===');
    console.log(`Pool exists after reload: ${Boolean(persisted)}`);

    if (!persisted) {
      throw new Error('POOL_PERSISTENCE_RELOAD_FAILED');
    }

    if (
      persisted.chainId !== formation.chainId ||
      persisted.poolId !== formation.poolId.toLowerCase() ||
      persisted.blockNumber !== formation.blockNumber ||
      persisted.transactionHash !== formation.transactionHash.toLowerCase() ||
      persisted.logIndex !== formation.logIndex
    ) {
      throw new Error('POOL_PROVENANCE_PERSISTENCE_FAILED');
    }

    reopened.close();

    if (
      first.inserted !== true ||
      second.inserted !== false
    ) {
      throw new Error('POOL_DEDUP_FAILED');
    }

    console.log('');
    console.log('=== CROSS-LAYER ===');
    console.log(`Chain ID: ${persisted.chainId}`);
    console.log(`Pool ID: ${persisted.poolId}`);
    console.log(`Formation block: ${persisted.blockNumber}`);
    console.log(`Formation tx: ${persisted.transactionHash}`);
    console.log(`Formation log index: ${persisted.logIndex}`);

    console.log('');
    console.log(
      'RPC → INITIALIZE → FORMATION → SQLITE → RELOAD: OK'
    );
    console.log('LIVE POOL → SQLITE: OK');
  } finally {
    provider.destroy();
  }
})().catch(error => {
  console.error('LIVE POOL → SQLITE: FAILED');
  console.error(error.message);
  process.exitCode = 1;
});
