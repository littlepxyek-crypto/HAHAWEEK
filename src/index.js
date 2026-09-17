'use strict';

let shutdownRequested = false;

function requestShutdown(signal) {
  shutdownRequested = true;
  console.log(`HAHAWEEK SCAN: received ${signal}; finishing current cycle`);
}

function handleSIGINT() {
  requestShutdown('SIGINT');
}

function handleSIGTERM() {
  requestShutdown('SIGTERM');
}

process.on('SIGINT', handleSIGINT);
process.on('SIGTERM', handleSIGTERM);


const { createProvider } = require('./core/rpc');
const {
  CHAIN_ID,
  CONFIRMATIONS,
  CHUNK_SIZE,
} = require('./core/config');

const { BlockCursor } = require('./core/block-cursor');
const { IngestionEngine } = require('./core/ingestion');
const { RawLogIngestion } = require('./core/raw-log-ingestion');

const { createDatabase } = require('./core/database');
const { createRawEventStore } = require('./core/raw-event-store');
const { appendUnique } = require('./core/raw-store');
const { loadState, saveState } = require('./core/state');

const {
  POOL_MANAGER,
} = require('./core/pool-discovery');

const {
  TOPIC0: INITIALIZE_TOPIC0,
} = require('./core/initialize-decoder');

const {
  MODIFY_LIQUIDITY_TOPIC0,
} = require('./core/liquidity-event');

const {
  SWAP_TOPIC0,
} = require('./core/swap-event');

const EVENT_TOPICS = [
  INITIALIZE_TOPIC0,
  MODIFY_LIQUIDITY_TOPIC0,
  SWAP_TOPIC0,
];

function createRelevantLogFilter() {
  return {
    address: POOL_MANAGER,
    topics: [EVENT_TOPICS],
  };
}

async function createEngine() {
  const provider = createProvider();

  const database = await createDatabase();

  const rawEventStore = createRawEventStore(database.db);

  const cursor = new BlockCursor();

  const rawLogs = new RawLogIngestion({
    provider,

    appendUnique: (log, chainId) => {
      const raw = appendUnique(log, chainId);

      if (raw.inserted) {
        rawEventStore.insert({
          event_id: raw.eventId,
          chain_id: chainId,
          block_number: log.blockNumber,
          transaction_hash: log.transactionHash.toLowerCase(),
          log_index: log.index ?? log.logIndex ?? 0,
          address: log.address,
          topics: log.topics,
          data: log.data,
          captured_at: new Date().toISOString(),
        });
      }

      return raw;
    },

    chainId: CHAIN_ID,
    chunkSize: 10,
  });

  const processor = async (block) => {
    const result = await rawLogs.ingestRange(
      block,
      block,
      createRelevantLogFilter()
    );

    /*
     * Persist once per completed block,
     * not once per event.
     */
    database.save();

    console.log(
      `Block ${block}: fetched=${result.fetched} ` +
      `inserted=${result.inserted} ` +
      `duplicates=${result.duplicates}`
    );

    return result;
  };

  const processorRange = async (fromBlock, toBlock) => {
    const result = await rawLogs.ingestRange(
      fromBlock,
      toBlock,
      createRelevantLogFilter()
    );

    /*
     * Persist only after the complete batch succeeds.
     * IngestionEngine advances the cursor only after
     * processorRange resolves successfully.
     */
    database.save();

    console.log(
      `Blocks ${fromBlock}-${toBlock}: fetched=${result.fetched}` +
      ` inserted=${result.inserted}` +
      ` duplicates=${result.duplicates}`
    );

    return result;
  };

  const ingestion = new IngestionEngine({
    provider,
    cursor,
    confirmations: CONFIRMATIONS,
    processor,
    processorRange,
    batchSize: CHUNK_SIZE,
  });

  return {
    provider,
    database,
    ingestion,
  };
}

async function main() {
  const engine = await createEngine();

  /*
   * Mark execution as running before processing.
   */
  const currentState = loadState();

  saveState({
    ...currentState,
    status: 'RUNNING',
    lastError: null,
  });

  try {
    const result = await engine.ingestion.runOnce();

    saveState({
      ...loadState(),
      status: 'IDLE',
      lastError: null,
    });

    if (shutdownRequested) {
      console.log('HAHAWEEK SCAN: graceful shutdown complete');
    }

    console.log('=== HAHAWEEK SCAN ===');
    console.log(`Chain ID: ${CHAIN_ID}`);
    console.log(`Latest block: ${result.latestBlock}`);
    console.log(`Safe head: ${result.safeHead}`);
    console.log(`Processed: ${result.processed}`);
    console.log(`Cursor: ${result.cursor}`);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    saveState({
      ...loadState(),
      status: 'FAILED',
      lastError: message,
    });

    throw error;
  } finally {
    engine.database.close();
    engine.provider.destroy();

    process.removeListener('SIGINT', handleSIGINT);
    process.removeListener('SIGTERM', handleSIGTERM);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('HAHAWEEK SCAN: FAILED');
    console.error(
      error instanceof Error
        ? error.message
        : String(error)
    );

    process.exitCode = 1;
  });
}

module.exports = {
  createEngine,
  createRelevantLogFilter,
  main,
};
