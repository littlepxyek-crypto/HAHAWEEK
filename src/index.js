'use strict';

const {
  classifyFailure,
  createFailureState,
  createHealthyState,
  readOperationalState,
} = require('./core/operational-state');
const { cleanupResources } = require('./core/runtime-cleanup');

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

const { createProvider } = require('./core/rpc');
const {
  RPC_URL,
  RPC_URLS,
  CHAIN_ID,
  CONFIRMATIONS,
  CHUNK_SIZE,
  LOG_CHUNK_SIZE,
  MAX_BATCHES_PER_RUN,
  MAX_RUNTIME_MS,
  MAX_RPC_CALLS_PER_RUN,
  START_BLOCK,
  MODE,
} = require('./core/config');
const config = require('./core/config');
const path = require('path');
const { createRuntimeBudget } = require('./core/rpc-call');
const { ensureGapTable, hasExactGap, recordGap } = require('./core/window-ledger');
const { runWindowPass } = require('./core/window-ingestion');
const { redactText } = require('./core/redact');

function redactRpc(message) {
  return redactText(message, [RPC_URL, ...RPC_URLS]);
}

const { BlockCursor } = require('./core/block-cursor');
const { IngestionEngine } = require('./core/ingestion');
const { RawLogIngestion } = require('./core/raw-log-ingestion');

const { createDatabase } = require('./core/database');
const { createRawEventStore } = require('./core/raw-event-store');
const { appendUnique } = require('./core/raw-store');
const { loadState, saveState } = require('./core/state');
const { persistOperationalFailure } = require('./core/operational-failure-persistence');
const { createLegacyWriteBarrier } = require('./core/legacy-write-freeze');
const { createWriterFence } = require('./core/single-writer-fence');
const { assertProductionAuthority } = require('./core/f03-production-authority-record');
const { assertAuthorityBinding } = require('./core/f03-authority-binding');
const { createAuthorityGate } = require('./core/f03-ingestion-authority-integration');
const { readF03AuthorityChain } = require('./core/f03-authoritative-chain-persistence');
const { createF03ExpectedAuthorityEstablisher } = require('./core/f03-runtime-establishment');
const { createVerifiedProcessingContext } = require('./core/runtime-processing-context');
const { reconcileProductionAuthorityLifecycleCursor } = require('./core/production-authority-lifecycle-reconciliation');
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

function createRawEventRecord(log, chainId, eventId) {
  if (!log || typeof log !== 'object') throw new Error('RAW_EVENT_LOG_REQUIRED');
  return {
    event_id: eventId,
    chain_id: chainId,
    block_number: log.blockNumber,
    transaction_hash: log.transactionHash,
    block_hash: log.blockHash ?? null,
    transaction_index: log.transactionIndex ?? null,
    log_index: log.index ?? log.logIndex ?? 0,
    address: log.address,
    topics: log.topics,
    data: log.data,
    captured_at: new Date().toISOString(),
  };
}

function createDurableExpectedAuthorityFactory(database) {
  if (!database || !database.db) throw new Error('AUTHORITY_EXPECTED_DATABASE_REQUIRED');

  return ({ fromBlock, toBlock }) =>
    readF03AuthorityChain({ database, fromBlock, toBlock });
}

async function createEngine({
  authorityFactory,
  expectedAuthorityFactory,
  providerFactory = createProvider,
  writerFenceFactory = createWriterFence,
  mode = MODE,
} = {}) {
  const windowMode = mode === 'window';
  let windowPlanner = null;
  let provider = null;
  let writerFence = null;
  let legacyWriteBarrier = null;
  let database = null;

  try {
    // Resource construction and acquisition belong inside the guarded lifecycle:
    // a busy/invalid writer fence must not leak the already-created RPC provider.
    provider = providerFactory();
    writerFence = writerFenceFactory();
    writerFence.acquire();
    legacyWriteBarrier = createLegacyWriteBarrier({ writerFence });
    /*
     * Start the existing watchdog immediately after acquiring the fence.
     * Engine initialization and authority reconciliation may perform
     * asynchronous work before IngestionEngine.runOnce() starts; the
     * acquired lease must remain protected during that interval.
     */
    await writerFence.startWatchdog();

    database = await createDatabase(undefined, { legacyWriteBarrier });
    // Batch-boundary commit: one DB file write per authorized batch instead
    // of one per processing step (see database.js setDeferredSaves).
    if (typeof database.setDeferredSaves === 'function') database.setDeferredSaves(true);
    if (windowMode) {
      writerFence.assertOwned();
      ensureGapTable(database);
    }

  const rawEventStore = createRawEventStore(database.db, { legacyWriteBarrier });

  const cursor = new BlockCursor({
    saveState: state => saveState(state, { legacyWriteBarrier }),
  });

  const rawLogs = new RawLogIngestion({
    provider,

    appendUnique: (log, chainId) => {
      const raw = appendUnique(log, chainId, { legacyWriteBarrier });

      rawEventStore.insert(
        createRawEventRecord(log, chainId, raw.eventId)
      );

      return raw;
    },

    chainId: CHAIN_ID,
    chunkSize: LOG_CHUNK_SIZE,
  });

  /*
   * Legacy single-block path is disabled.
   * It persisted raw logs before the authority gate, and with
   * requireProcessingContext: true the gate can never accept it,
   * leaving unauthorized writes and a stuck cursor.
   * Production ingestion must use processorRange:
   * verified processing context -> authority gate -> cursor advance.
   */
  const processor = async (block) => {
    throw new Error(`LEGACY_SINGLE_BLOCK_PATH_DISABLED: block ${block}`);
  };

  const processorRange = async (fromBlock, toBlock, budget, options = {}) => {
    const context = await createVerifiedProcessingContext({
      database,
      provider,
      writerFence,
      confirmations: CONFIRMATIONS,
      chainId: CHAIN_ID,
      fromBlock,
      toBlock,
      // Window mode passes the head it planned against (saves one RPC call
      // per segment); the decision input still checks the range against it.
      ...(Number.isInteger(options.latestBlock) ? { latestBlock: options.latestBlock } : {}),
      provenance: {
        component: 'runtime-processing-context',
        range: `${fromBlock}-${toBlock}`,
      },
      rawIngest: async (rangeFrom, rangeTo) => {
        const result = await rawLogs.ingestRange(
          rangeFrom,
          rangeTo,
          createRelevantLogFilter(),
          budget
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
  const durableExpectedAuthorityFactory = createDurableExpectedAuthorityFactory(database);
  const establishF03ExpectedAuthority = createF03ExpectedAuthorityEstablisher({ database, writerFence });
  const productionExpectedAuthorityFactory = expectedAuthorityFactory || ((args) => {
    if (args && args.processingContext) return establishF03ExpectedAuthority(args);
    return durableExpectedAuthorityFactory(args);
  });

  reconcileProductionAuthorityLifecycleCursor({
    database,
    cursor,
    expectedAuthorityFactory: productionExpectedAuthorityFactory,
    // Window mode: a cursor jump is accepted only over a recorded gap that
    // covers exactly the skipped range; anything else fails closed.
    ...(windowMode ? { gapCovers: (start, end) => hasExactGap(database, start, end) } : {}),
  });

  const windowOptions = windowMode
    ? {
        rangePlanner: (args) => {
          if (typeof windowPlanner !== 'function') throw new Error('WINDOW_PLANNER_REQUIRED');
          return windowPlanner(args);
        },
        gapRecorder: (gap) => {
          writerFence.assertOwned();
          recordGap(database, gap);
        },
      }
    : {};

  const ingestion = new IngestionEngine({
    provider,
    cursor,
    confirmations: CONFIRMATIONS,
    processor,
    processorRange,
    batchSize: CHUNK_SIZE,
    maxBatchesPerRun: MAX_BATCHES_PER_RUN,
    maxRuntimeMs: MAX_RUNTIME_MS,
    maxRpcCalls: MAX_RPC_CALLS_PER_RUN,
    startBlock: START_BLOCK,
    ...windowOptions,
    batchCommitter: typeof database.flush === 'function'
      ? () => { writerFence.assertOwned(); database.flush(); }
      : undefined,
    writerFence,
    authorityGate: createAuthorityGate({
      authorityFactory: productionAuthorityFactory,
      expectedAuthorityFactory: productionExpectedAuthorityFactory,
      authorityValidator: assertProductionAuthority,
      authorityBindingValidator: assertAuthorityBinding,
      authorityCommitter: productionAuthorityCommitter,
      writerFence,
      requireProcessingContext: true,
    }),
  });

    return {
      mode,
      provider,
      database,
      ingestion,
      legacyWriteBarrier,
      writerFence,
      setWindowPlanner(planner) {
        if (!windowMode) throw new Error('WINDOW_MODE_REQUIRED');
        windowPlanner = planner;
      },
    };
  } catch (error) {
    const cleanupFailures = await cleanupResources([
      ...(writerFence ? [['writerFence.stopWatchdog', () => writerFence.stopWatchdog()]] : []),
      ...(database ? [['database.close', () => database.close()]] : []),
      ...(writerFence ? [['writerFence.release', () => writerFence.release()]] : []),
      ...(provider ? [['provider.destroy', () => provider.destroy()]] : []),
    ], (label, cleanupError) => {
      console.error(`HAHAWEEK INITIALIZATION CLEANUP FAILED (${label}): ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
    });

    // Preserve the initialization error as the primary failure.
    if (cleanupFailures.length > 0) {
      console.error(`HAHAWEEK INITIALIZATION CLEANUP: ${cleanupFailures.length} cleanup action(s) failed`);
    }
    throw error;
  }
}

function windowLedgerFile() {
  // src/pass.js sets HAHAWEEK_WINDOW_ROOT_DIR to the root data dir (outside
  // the evidence epoch). Run directly, the ledger sits in the data dir.
  const root = process.env.HAHAWEEK_WINDOW_ROOT_DIR ||
    process.env.HAHAWEEK_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(root, 'window', 'discovery-ledger.json');
}

function printWindowSummary(result) {
  console.log(`Mode: window`);
  console.log(`Horizon (min(safe head, discovery)): ${result.horizon}`);
  console.log(`Segments authorized: ${result.segments.length}` +
    ` (${result.segments.map(s => `${s.fromBlock}-${s.toBlock}`).join(', ') || '-'})`);
  console.log(`Gaps recorded: ${result.gaps.length}` +
    ` (${result.gaps.reduce((sum, g) => sum + (g.endBlock - g.startBlock + 1), 0)} blocks skipped)`);
  console.log(`Pools: selected=${result.pools.selected} deferred=${result.pools.deferred}` +
    ` ingested=${result.pools.ingested} dropped=${result.pools.dropped} pending=${result.pools.pending}`);
  console.log(`Latest-window coverage: ${result.latestCoverage ?? 'UNKNOWN'}`);
  console.log(`Stage 2 ms: ${result.stageMs}`);
}

async function main() {
  shutdownRequested = false;
  process.on('SIGINT', handleSIGINT);
  process.on('SIGTERM', handleSIGTERM);

  let engine = null;
  let primaryError = null;

  try {
    engine = await createEngine();
    /*
     * Mark execution as running before processing.
     * H-01 may reject this write when legacy persistence is frozen.
     */
    const currentState = loadState();
    readOperationalState(currentState);

    saveState({
      ...currentState,
      status: 'RUNNING',
      operationalState: 'INITIALIZING',
      failure: null,
      recovery: {
        state: 'NOT_REQUIRED',
        required: false,
      },
      lastError: null,
      lastVerifiedCursor:
        Number.isInteger(currentState.lastVerifiedCursor)
          ? currentState.lastVerifiedCursor
          : currentState.lastProcessedBlock,
    }, { legacyWriteBarrier: engine.legacyWriteBarrier });

    const result = engine.mode === 'window'
      ? await runWindowPass({
          engine,
          ledgerFile: windowLedgerFile(),
          settings: config,
          createBudget: () => createRuntimeBudget({ maxRuntimeMs: MAX_RUNTIME_MS, maxCalls: MAX_RPC_CALLS_PER_RUN }),
        })
      : await engine.ingestion.runOnce();

    const healthyState = createHealthyState(loadState());
    saveState({
      ...healthyState,
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
    if (result.mode === 'window') printWindowSummary(result);
    if (Number.isInteger(result.behind)) {
      console.log(`Behind safe head: ${result.behind} blocks`);
    }
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
    primaryError = error;
    if (!engine) {
      throw error;
    }

    const message = redactRpc(
      error instanceof Error
        ? error.message
        : String(error)
    );

    const failure = classifyFailure(error);

    if (engine.writerFence && typeof engine.writerFence.getWatchdogDiagnostics === 'function') {
      const watchdogDiagnostics = engine.writerFence.getWatchdogDiagnostics();
      if (watchdogDiagnostics) {
        console.error(
          'HAHAWEEK WRITER-FENCE WATCHDOG DIAGNOSTICS: ' +
          JSON.stringify(watchdogDiagnostics)
        );
      }
    }

    try {
      const failureState = createFailureState({
        ...loadState(),
        status: 'FAILED',
        lastError: message,
      }, failure);

      saveState(
        failureState,
        { legacyWriteBarrier: engine.legacyWriteBarrier }
      );
    } catch (stateError) {
      console.error('HAHAWEEK OPERATIONAL STATE: PRIMARY WRITE FAILED');
      console.error(redactRpc(
        stateError instanceof Error
          ? stateError.message
          : String(stateError)
      ));

      /*
       * If the active writer fence has already expired or become stale,
       * its guarded operational-state write must fail closed. The
       * repository already provides a bounded operational-failure writer
       * which acquires a fresh fence for derived operational state only.
       * It must never be used for cursor, evidence, checkpoint, or
       * authority persistence.
       */
      try {
        const fallbackFailure = persistOperationalFailure(error);
        console.error(
          `HAHAWEEK OPERATIONAL STATE: FALLBACK PERSISTED ${fallbackFailure.failure_code}`
        );
      } catch (fallbackError) {
        console.error('HAHAWEEK OPERATIONAL STATE: FALLBACK PERSISTENCE FAILED');
        console.error(
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError)
        );
      }
    }

    throw error;
  } finally {
    const cleanupFailures = engine
      ? await cleanupResources([
          ['database.close', () => engine.database.close()],
          ['writerFence.stopWatchdog', () => engine.writerFence.stopWatchdog()],
          ['writerFence.release', () => engine.writerFence.release()],
          ['provider.destroy', () => engine.provider.destroy()],
        ], (label, error) => {
          console.error(`HAHAWEEK CLEANUP FAILED (${label}): ${error instanceof Error ? error.message : String(error)}`);
        })
      : [];

    process.removeListener('SIGINT', handleSIGINT);
    process.removeListener('SIGTERM', handleSIGTERM);

    if (cleanupFailures.length > 0 && !primaryError) {
      throw new AggregateError(
        cleanupFailures.map(item => item.error),
        'RUNTIME_CLEANUP_FAILED'
      );
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('HAHAWEEK SCAN: FAILED');
    console.error(redactRpc(
      error instanceof Error
        ? error.message
        : String(error)
    ));

    process.exitCode = 1;
  });
}

module.exports = {
  createEngine,
  createRelevantLogFilter,
  createRawEventRecord,
  createDurableExpectedAuthorityFactory,
  main,
};