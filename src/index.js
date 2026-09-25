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
  MAX_BATCHES_PER_RUN,
} = require('./core/config');

const { BlockCursor } = require('./core/block-cursor');
const { IngestionEngine } = require('./core/ingestion');
const { RawLogIngestion } = require('./core/raw-log-ingestion');

const { createDatabase } = require('./core/database');
const { createRawEventStore } = require('./core/raw-event-store');
const { appendUnique } = require('./core/raw-store');
const { loadState, saveState } = require('./core/state');
const { createLegacyWriteBarrier } = require('./core/legacy-write-freeze');
const { createWriterFence } = require('./core/single-writer-fence');
const { assertProductionAuthority } = require('./core/f03-production-authority-record');
const { assertAuthorityBinding } = require('./core/f03-authority-binding');
const { createAuthorityGate } = require('./core/f03-ingestion-authority-integration');
const { readF03AuthorityChain } = require('./core/f03-authoritative-chain-persistence');
const { createVerifiedProcessingContext } = require('./core/runtime-processing-context');
const {
  prepareProductionAuthorityLifecycle,
  commitPreparedProductionAuthorityLifecycle,
} = require('./core/production-authority-lifecycle');

const {
  POOL_MANAGER,
} = require('./core/pool-discovery');

const {
  TOPIC0: INITIALIZE_TOPIC0,
} = require('./core/initialize-decoder');

const {
  MODIFY_LIQUIDITY_TOPIC,
} = require('./core/liquidity-event');

const {
  SWAP_TOPIC0: SWAP_TOPIC,
} = require('./core/swap-event');

const EVENT_TOPICS = [
  INITIALIZE_TOPIC0,
  MODIFY_LIQUIDITY_TOPIC,
  SWAP_TOPIC,
];

function createRelevantLogFilter() {
  return {
    address: POOL_MANAGER,
    topics: [EVENT_TOPICS],
  };
}

function createDurableExpectedAuthorityFactory(database) {
  if (!database || !database.db) throw new Error('AUTHORITY_EXPECTED_DATABASE_REQUIRED');

  return ({ fromBlock, toBlock }) =>
    readF03AuthorityChain({ database, fromBlock, toBlock });
}

async function createEngine({ authorityFactory, expectedAuthorityFactory } = {}) {
  const provider = createProvider();
  const writerFence = createWriterFence();
  writerFence.acquire();
  const legacyWriteBarrier = createLegacyWriteBarrier({ writerFence });

  const database = await createDatabase(undefined, { legacyWriteBarrier });

  const rawEventStore = createRawEventStore(database.db, { legacyWriteBarrier });

  const cursor = new BlockCursor({
    saveState: state => saveState(state, { legacyWriteBarrier }),
  });

  const rawLogs = new RawLogIngestion({
    provider,

    appendUnique: (log, chainId) => {
      const raw = appendUnique(log, chainId, { legacyWriteBarrier });

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
    const context = await createVerifiedProcessingContext({
      database,
      provider,
      writerFence,
      confirmations: CONFIRMATIONS,
      chainId: CHAIN_ID,
      fromBlock,
      toBlock,
      provenance: {
        component: 'runtime-processing-context',
        range: `${fromBlock}-${toBlock}`,
      },
      rawIngest: async (rangeFrom, rangeTo) => {
        const result = await rawLogs.ingestRange(
          rangeFrom,
          rangeTo,
          createRelevantLogFilter()
        );

        console.log(
          `Blocks ${rangeFrom}-${rangeTo}: fetched=${result.fetched}` +
          ` inserted=${result.inserted}` +
          ` duplicates=${result.duplicates}`
        );

        return result;
      },
    });

    return context;
  };

  const preparedLifecycles = new WeakMap();
  const productionAuthorityFactory = authorityFactory || (({ fromBlock, toBlock, processingContext, expectedAuthority }) => {
    if (!processingContext || processingContext.fromBlock !== fromBlock || processingContext.toBlock !== toBlock) {
      throw new Error('PROCESSING_CONTEXT_REQUIRED');
    }
    const prepared = prepareProductionAuthorityLifecycle({
      database,
      writerFence,
      processingContext,
      expectedAuthority,
    });
    preparedLifecycles.set(prepared.authority, prepared);
    return prepared.authority;
  });
  const productionAuthorityCommitter = authorityFactory
    ? undefined
    : ({ processingContext, expectedAuthority, authority }) => {
        const prepared = preparedLifecycles.get(authority);
        if (!prepared) throw new Error('LIFECYCLE_PREPARED_INPUT_MISSING');
        commitPreparedProductionAuthorityLifecycle({
          database,
          writerFence,
          processingContext,
          expectedAuthority,
          prepared,
        });
      };
  const productionExpectedAuthorityFactory = expectedAuthorityFactory || createDurableExpectedAuthorityFactory(database);

  const ingestion = new IngestionEngine({
    provider,
    cursor,
    confirmations: CONFIRMATIONS,
    processor,
    processorRange,
    batchSize: CHUNK_SIZE,
    maxBatchesPerRun: MAX_BATCHES_PER_RUN,
    authorityGate: createAuthorityGate({
      authorityFactory: productionAuthorityFactory,
      expectedAuthorityFactory: productionExpectedAuthorityFactory,
      authorityValidator: assertProductionAuthority,
      authorityBindingValidator: assertAuthorityBinding,
      authorityCommitter: productionAuthorityCommitter,
      writerFence,
    }),
  });

  return {
    provider,
    database,
    ingestion,
    legacyWriteBarrier,
    writerFence,
  };
}

async function main() {
  const engine = await createEngine();

  try {
    /*
     * Mark execution as running before processing.
     * H-01 may reject this write when legacy persistence is frozen.
     */
    const currentState = loadState();

    saveState({
      ...currentState,
      status: 'RUNNING',
      lastError: null,
    }, { legacyWriteBarrier: engine.legacyWriteBarrier });

    const result = await engine.ingestion.runOnce();

    saveState({
      ...loadState(),
      status: 'IDLE',
      lastError: null,
    }, { legacyWriteBarrier: engine.legacyWriteBarrier });

    if (shutdownRequested) {
      console.log('HAHAWEEK SCAN: graceful shutdown complete');
    }

    console.log('=== HAHAWEEK SCAN ===');
    console.log(`Chain ID: ${CHAIN_ID}`);
    console.log(`Latest block: ${result.latestBlock}`);
    console.log(`Safe head: ${result.safeHead}`);
    console.log(`Processed: ${result.processed}`);
    console.log(`Cursor: ${result.cursor}`);
    if (result.processingContext) {
      console.log(`Processing context: ${result.processingContext.status}`);
      console.log(`Range: ${result.processingContext.fromBlock}-${result.processingContext.toBlock}`);
      console.log(`Result ID: ${result.processingContext.processingResultId}`);
      console.log(`Execution ID: ${result.processingContext.processingExecutionId}`);
      console.log(`Lineage ID: ${result.processingContext.lineageId}`);
      console.log(`Transition: ${result.processingContext.transitionType}`);
      console.log(`Generation: ${result.processingContext.generation}`);
      console.log(`Evidence set digest: ${result.processingContext.evidenceSetDigest}`);
      console.log(`Authority: ${result.authorityOutcome?.status || 'UNKNOWN'}`);
      console.log(`Cursor outcome: ${result.cursor}`);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    saveState({
      ...loadState(),
      status: 'FAILED',
      lastError: message,
    }, { legacyWriteBarrier: engine.legacyWriteBarrier });

    throw error;
  } finally {
    engine.database.close();
    engine.writerFence.release();
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
  createDurableExpectedAuthorityFactory,
  main,
};
