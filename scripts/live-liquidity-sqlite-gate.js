'use strict';

const { createProvider } = require('../src/core/rpc');
const { createDatabase } = require('../src/core/database');
const { createLiquidityStore } = require('../src/core/liquidity-store');
const {
  POOL_MANAGER,
  INITIALIZE_TOPIC0,
} = require('../src/core/pool-discovery');
const {
  MODIFY_LIQUIDITY_TOPIC0,
  createLiquidityEvent,
} = require('../src/core/liquidity-event');

(async () => {
  const provider = createProvider();
  const database = await createDatabase();
  const store = createLiquidityStore(database.db);

  try {
    const latest = await provider.getBlockNumber();
    const confirmations = 3;
    const safeHead = latest - confirmations;

    const fromBlock = safeHead - 1000;
    const toBlock = safeHead;

    console.log('=== LIVE MODIFYLIQUIDITY → SQLITE GATE ===');
    console.log('Chain ID: 4663');
    console.log(`PoolManager: ${POOL_MANAGER}`);
    console.log(`Initialize topic0: ${INITIALIZE_TOPIC0}`);
    console.log(`ModifyLiquidity topic0: ${MODIFY_LIQUIDITY_TOPIC0}`);
    console.log(`Range: ${fromBlock} -> ${toBlock}`);

    // 1. Discover initialized pools in controlled chunks.
    let initializeLogs = [];

    for (
      let start = fromBlock;
      start <= toBlock;
      start += 100
    ) {
      const end = Math.min(start + 99, toBlock);

      const logs = await provider.getLogs({
        address: POOL_MANAGER,
        topics: [INITIALIZE_TOPIC0],
        fromBlock: start,
        toBlock: end,
      });

      initializeLogs.push(...logs);
    }

    console.log(`Initialize logs: ${initializeLogs.length}`);

    if (!initializeLogs.length) {
      throw new Error('NO_INITIALIZE_LOGS_FOUND');
    }

    // 2. Discover ModifyLiquidity events in the same window.
    let liquidityLogs = [];

    for (
      let start = fromBlock;
      start <= toBlock;
      start += 100
    ) {
      const end = Math.min(start + 99, toBlock);

      const logs = await provider.getLogs({
        address: POOL_MANAGER,
        topics: [MODIFY_LIQUIDITY_TOPIC0],
        fromBlock: start,
        toBlock: end,
      });

      liquidityLogs.push(...logs);
    }

    console.log(`ModifyLiquidity logs: ${liquidityLogs.length}`);

    if (!liquidityLogs.length) {
      throw new Error('NO_MODIFY_LIQUIDITY_LOGS_FOUND');
    }

    // 3. Decode Initialize using the existing pool discovery layer.
    const pools = [];

    for (const log of initializeLogs) {
      try {
        const { discoverPool } =
          require('../src/core/pool-discovery');

        pools.push(discoverPool(log));
      } catch {
        // Ignore malformed/non-matching Initialize candidates.
      }
    }

    if (!pools.length) {
      throw new Error('NO_VALID_INITIALIZED_POOLS');
    }

    const poolMap = new Map(
      pools.map(pool => [
        pool.poolId.toLowerCase(),
        pool,
      ])
    );

    console.log(`Valid initialized pools: ${poolMap.size}`);

    // 4. Find the first ModifyLiquidity that belongs to a
    //    pool initialized in this observation window.
    let matched = null;

    for (const log of liquidityLogs) {
      try {
        if (
          !Array.isArray(log.topics) ||
          log.topics.length !== 3
        ) {
          continue;
        }

        const poolId =
          `0x${log.topics[1].slice(-64)}`.toLowerCase();

        const pool = poolMap.get(poolId);

        if (!pool) {
          continue;
        }

        const event = createLiquidityEvent(
          log,
          pool
        );

        matched = {
          log,
          pool,
          event,
        };

        break;
      } catch {
        // Continue searching for a valid cross-layer match.
      }
    }

    if (!matched) {
      throw new Error(
        'NO_MODIFY_LIQUIDITY_MATCHED_TO_INITIALIZED_POOL'
      );
    }

    const { log, pool, event } = matched;

    console.log('');
    console.log('=== LIVE LIQUIDITY EVENT ===');
    console.log(`Pool ID: ${event.poolId}`);
    console.log(`Sender: ${event.sender}`);
    console.log(`Tick lower: ${event.tickLower}`);
    console.log(`Tick upper: ${event.tickUpper}`);
    console.log(`Liquidity delta: ${event.liquidityDelta}`);
    console.log(`Salt: ${event.salt}`);
    console.log(`Block: ${event.blockNumber}`);
    console.log(`Transaction: ${event.transactionHash}`);
    console.log(`Log index: ${event.logIndex}`);

    // 5. Persist.
    const first = store.insert(event);
    database.save();

    // 6. Replay exact same blockchain event.
    const second = store.insert(event);
    database.save();

    console.log('');
    console.log('=== SQLITE INSERT ===');
    console.log(`First inserted: ${first.inserted}`);
    console.log(`Second inserted: ${second.inserted}`);
    console.log(`Liquidity rows: ${store.count()}`);

    if (
      first.inserted !== true ||
      second.inserted !== false
    ) {
      throw new Error('LIQUIDITY_DEDUP_FAILED');
    }

    // 7. Reload database.
    database.close();

    const reopened = await createDatabase();
    const reopenedStore =
      createLiquidityStore(reopened.db);

    const restored =
      reopenedStore.get(event.identity);

    console.log('');
    console.log('=== RELOAD ===');
    console.log(
      `Event exists after reload: ${Boolean(restored)}`
    );

    if (!restored) {
      throw new Error(
        'LIQUIDITY_PERSISTENCE_RELOAD_FAILED'
      );
    }

    // 8. Provenance verification.
    if (
      restored.chainId !== event.chainId ||
      restored.poolId !== event.poolId.toLowerCase() ||
      restored.blockNumber !== event.blockNumber ||
      restored.transactionHash !==
        event.transactionHash.toLowerCase() ||
      restored.logIndex !== event.logIndex ||
      restored.sender !== event.sender.toLowerCase() ||
      restored.tickLower !== event.tickLower ||
      restored.tickUpper !== event.tickUpper ||
      restored.liquidityDelta !==
        event.liquidityDelta
    ) {
      throw new Error(
        'LIQUIDITY_PROVENANCE_PERSISTENCE_FAILED'
      );
    }

    reopened.close();

    console.log('');
    console.log('=== CROSS-LAYER ===');
    console.log(`Chain ID: ${restored.chainId}`);
    console.log(`Pool ID: ${restored.poolId}`);
    console.log(`Event ID: ${restored.eventId}`);
    console.log(`Block: ${restored.blockNumber}`);
    console.log(`Transaction: ${restored.transactionHash}`);
    console.log(`Log index: ${restored.logIndex}`);

    console.log('');
    console.log(
      'RPC → MODIFYLIQUIDITY → ABI → POOL → SQLITE → RELOAD: OK'
    );
    console.log(
      'LIVE MODIFYLIQUIDITY → SQLITE: OK'
    );
  } finally {
    provider.destroy();
  }
})().catch(error => {
  console.error(
    'LIVE MODIFYLIQUIDITY → SQLITE: FAILED'
  );
  console.error(error.message);
  process.exitCode = 1;
});
