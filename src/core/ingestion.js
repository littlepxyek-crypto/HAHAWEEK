'use strict';

const { getSafeHead } = require('./confirmation');
const { createRuntimeBudget, rpcCall } = require('./rpc-call');

class IngestionEngine {
  constructor({
    provider,
    cursor,
    confirmations,
    processor,
    processorRange,
    batchSize,
      maxBatchesPerRun,
    authorityGate,
    writerFence,
    writerFenceRenewalIntervalMs,
    maxRuntimeMs,
    maxRpcCalls,
    startBlock = null,
    rangePlanner,
    gapRecorder,
  }) {
    if (!provider) {
      throw new Error('PROVIDER_REQUIRED');
    }

    if (!cursor) {
      throw new Error('CURSOR_REQUIRED');
    }

    if (!processor) {
      throw new Error('PROCESSOR_REQUIRED');
    }

    if (
      !Number.isInteger(confirmations) ||
      confirmations < 0
    ) {
      throw new Error('INVALID_CONFIRMATIONS');
    }

    if (
      processorRange !== undefined &&
      typeof processorRange !== 'function'
    ) {
      throw new Error('INVALID_PROCESSOR_RANGE');
    }

    if (
      batchSize !== undefined &&
      (!Number.isInteger(batchSize) || batchSize <= 0)
    ) {
      throw new Error('INVALID_BATCH_SIZE');
    }

    if (
      maxBatchesPerRun !== undefined &&
      (!Number.isInteger(maxBatchesPerRun) || maxBatchesPerRun <= 0)
    ) {
      throw new Error('INVALID_MAX_BATCHES_PER_RUN');
    }

    if (
      startBlock !== null &&
      startBlock !== undefined &&
      (!Number.isSafeInteger(startBlock) || startBlock < 0)
    ) {
      throw new Error('INVALID_START_BLOCK');
    }

    if (rangePlanner !== undefined && typeof rangePlanner !== 'function') {
      throw new Error('INVALID_RANGE_PLANNER');
    }
    if (rangePlanner !== undefined && typeof gapRecorder !== 'function') {
      throw new Error('GAP_RECORDER_REQUIRED');
    }
    if (rangePlanner !== undefined && typeof processorRange !== 'function') {
      throw new Error('PROCESSOR_RANGE_REQUIRED');
    }

    if (
      processorRange !== undefined &&
      batchSize === undefined
    ) {
      throw new Error('BATCH_SIZE_REQUIRED');
    }

    this.provider = provider;
    this.cursor = cursor;
    this.confirmations = confirmations;
    this.processor = processor;
    this.processorRange = processorRange;
    this.batchSize = batchSize;
    this.maxBatchesPerRun = maxBatchesPerRun ?? Infinity;
    this.startBlock = startBlock ?? null;
    this.rangePlanner = rangePlanner;
    this.gapRecorder = gapRecorder;
    if (typeof authorityGate !== 'function') {
      throw new Error('AUTHORITY_GATE_REQUIRED');
    }
    this.authorityGate = authorityGate;
    this.writerFence = writerFence;
    this.writerFenceRenewalIntervalMs = writerFenceRenewalIntervalMs ?? (
      writerFence && typeof writerFence.getLeaseMs === 'function'
        ? Math.max(1, Math.floor(writerFence.getLeaseMs() / 3))
        : null
    );
    this.running = false;
    this.runtimeBudgetOptions = { maxRuntimeMs, maxCalls: maxRpcCalls };
  }

  async runOnce() {
    if (this.running) {
      throw new Error('INGESTION_ALREADY_RUNNING');
    }

    this.running = true;

    const budget = createRuntimeBudget(this.runtimeBudgetOptions);

    let heartbeat = null;
    let watchdogStarted = false;
    let renewalError = null;
    const startWriterFenceHeartbeat = () => {
      if (!this.writerFence || typeof this.writerFence.renew !== 'function') return;
      if (!Number.isFinite(this.writerFenceRenewalIntervalMs) || this.writerFenceRenewalIntervalMs <= 0) return;
      heartbeat = setInterval(() => {
        try { this.writerFence.renew(); } catch (error) { renewalError = error; }
      }, this.writerFenceRenewalIntervalMs);
    };
    const assertWriterFenceHeartbeat = () => {
      if (renewalError) throw renewalError;
      if (this.writerFence && typeof this.writerFence.assertOwned === 'function') this.writerFence.assertOwned();
    };

    try {
      assertWriterFenceHeartbeat();
      if (this.writerFence && typeof this.writerFence.startWatchdog === 'function') {
        await this.writerFence.startWatchdog();
        watchdogStarted = true;
      }
      if (!watchdogStarted) {
        startWriterFenceHeartbeat();
      }
      const latestBlock = await rpcCall(
        () => this.provider.getBlockNumber(),
        { budget }
      );

      const safeHead = getSafeHead(
        latestBlock,
        this.confirmations
      );

      if (typeof this.rangePlanner === 'function') {
        return await this.runPlannedSegments({
          budget,
          latestBlock,
          safeHead,
          assertWriterFenceHeartbeat,
          watchdogStarted,
        });
      }

      let current = this.cursor.get();

      /*
       * First run:
       * do not persist an unverified cursor boundary. Treat the safe head as
       * the first block to acquire, process, and authorize. The cursor remains
       * null until the ordinary PROCESS -> AUTHORITY ACCEPT -> CURSOR ADVANCE
       * path succeeds. Blocks before safeHead remain outside this acquisition
       * window and are not interpreted as absent evidence.
       */
      if (current === null) {
        /*
         * A configured start block (backfill) only applies while no cursor
         * exists. It goes through the same verified PROCESS -> AUTHORITY ->
         * CURSOR path; it never seeds the cursor directly. A start block
         * above the safe head simply waits until the chain reaches it.
         */
        current = this.startBlock !== null
          ? this.startBlock - 1
          : safeHead - 1;
      }

      /*
       * Already caught up.
       */
      if (current >= safeHead) {
        return {
          processed: 0,
          latestBlock,
          safeHead,
          cursor: current,
        };
      }

      let processed = 0;

      /*
       * ============================================================
       * BATCH PROCESSOR PATH
       * ============================================================
       *
       * A batch is processed as one checkpoint unit.
       *
       * IMPORTANT:
       * cursor advances ONLY after processorRange succeeds.
       *
       * Example:
       *
       * current = 100
       * batchSize = 5
       *
       * processorRange(101, 105)
       *       ↓ success
       * cursor = 105
       *
       * processorRange(106, 110)
       *       ↓ failure
       * cursor remains 105
       *
       * This guarantees restart recovery from the last
       * successfully completed batch.
       */
      if (typeof this.processorRange === 'function') {
        let batchesProcessed = 0;
        let lastProcessingContext = null;
        let lastAuthorityOutcome = null;

        for (
          let fromBlock = current + 1;
          fromBlock <= safeHead &&
              batchesProcessed < this.maxBatchesPerRun;
          fromBlock += this.batchSize
        ) {
          const toBlock = Math.min(
            fromBlock + this.batchSize - 1,
            safeHead
          );

          /*
           * Without a watchdog, renew at the batch boundary as an explicit
           * lease guard. When the watchdog is active it is the sole renewal
           * mechanism, so the main thread must not contend for the lock.
           */
          assertWriterFenceHeartbeat();
          if (!watchdogStarted && this.writerFence && typeof this.writerFence.renew === 'function') {
            this.writerFence.renew();
          }
          assertWriterFenceHeartbeat();

          /*
           * DO NOT advance cursor before this resolves.
           */
          const processingContext = await this.processorRange(
            fromBlock,
            toBlock,
            budget
          );
          assertWriterFenceHeartbeat();

          /*
           * Without a watchdog, renew again before authority validation so
           * authority work starts with a fresh writer-fence lease.
           */
          if (!watchdogStarted && this.writerFence && typeof this.writerFence.renew === 'function') {
            this.writerFence.renew();
          }
          assertWriterFenceHeartbeat();

          /*
           * Authority must accept the exact verified context
           * before the unchanged cursor barrier may advance.
           */
          lastProcessingContext = processingContext;
          const authorityInput = {
            checkpointCommitted: true,
            fromBlock,
            toBlock,
            blockNumber: toBlock,
          };
          if (processingContext !== undefined) {
            authorityInput.processingContext = processingContext;
          }
          lastAuthorityOutcome = this.authorityGate(authorityInput);
          if (lastAuthorityOutcome?.status !== 'AUTHORIZED') {
            throw new Error('AUTHORITY_ACCEPTANCE_REQUIRED');
          }
          this.cursor.advance(toBlock);

          processed += toBlock - fromBlock + 1;
            batchesProcessed += 1;
        }

        const cursorAfter = this.cursor.get();
        return {
          processed,
          latestBlock,
          safeHead,
          cursor: cursorAfter,
          behind: Number.isInteger(cursorAfter) ? Math.max(0, safeHead - cursorAfter) : null,
          processingContext: lastProcessingContext,
          authorityOutcome: lastAuthorityOutcome,
        };
      }

      /*
       * ============================================================
       * LEGACY SINGLE-BLOCK PROCESSOR PATH
       * ============================================================
       *
       * Existing behavior is preserved.
       *
       * This path remains active when processorRange is not supplied.
       */
      for (
        let block = current + 1;
        block <= safeHead;
        block += 1
      ) {
        await this.processor(block, budget);
        assertWriterFenceHeartbeat();

        /*
         * Cursor advances ONLY after successful processing.
         */
        const authorityOutcome = this.authorityGate({ checkpointCommitted: true, fromBlock: block, toBlock: block, blockNumber: block });
        if (authorityOutcome?.status !== 'AUTHORIZED') {
          throw new Error('AUTHORITY_ACCEPTANCE_REQUIRED');
        }
        this.cursor.advance(block);

        processed += 1;
      }

      return {
        processed,
        latestBlock,
        safeHead,
        cursor: this.cursor.get(),
      };
    } finally {
      if (heartbeat) clearInterval(heartbeat);
      if (this.writerFence && typeof this.writerFence.stopWatchdog === 'function') {
        await this.writerFence.stopWatchdog();
      }
      this.running = false;
    }
  }
}

/*
 * Window-watch: process planned, possibly non-adjacent segments.
 *
 * For every segment, in ascending order:
 *   1. if it does not start right after the cursor, record the skipped range
 *      [cursor + 1, segment.from - 1] as a gap BEFORE processing it;
 *   2. verified processing context (headers + linkage + raw logs + lineage);
 *      a segment that is not adjacent to an earlier lineage resolves to a new
 *      INITIAL lineage, so no continuity is claimed across a gap;
 *   3. authority gate; the cursor advances only after AUTHORIZED.
 * Any failure stops the pass with the cursor at the last authorized segment.
 */
IngestionEngine.prototype.runPlannedSegments = async function runPlannedSegments({
  budget,
  latestBlock,
  safeHead,
  assertWriterFenceHeartbeat,
  watchdogStarted,
}) {
  const plan = await this.rangePlanner({ cursor: this.cursor.get(), safeHead, latestBlock });
  const segments = plan && Array.isArray(plan.segments) ? plan.segments : null;
  if (!segments) throw new Error('WINDOW_PLAN_INVALID');

  let processed = 0;
  let lastProcessingContext = null;
  let lastAuthorityOutcome = null;
  const authorized = [];
  const gaps = [];

  for (const segment of segments) {
    const { fromBlock, toBlock } = segment;
    if (!Number.isSafeInteger(fromBlock) || !Number.isSafeInteger(toBlock) || fromBlock < 0 || toBlock < fromBlock) {
      throw new Error('WINDOW_SEGMENT_INVALID');
    }
    if (toBlock > safeHead) throw new Error('WINDOW_SEGMENT_ABOVE_SAFE_HEAD');
    if (Number.isInteger(plan.horizon) && toBlock > plan.horizon) throw new Error('WINDOW_SEGMENT_ABOVE_HORIZON');
    const cursor = this.cursor.get();
    if (cursor !== null && fromBlock <= cursor) throw new Error('WINDOW_SEGMENT_OVERLAPS_CURSOR');

    assertWriterFenceHeartbeat();
    if (!watchdogStarted && this.writerFence && typeof this.writerFence.renew === 'function') {
      this.writerFence.renew();
    }

    if (cursor !== null && fromBlock > cursor + 1) {
      const gap = {
        startBlock: cursor + 1,
        endBlock: fromBlock - 1,
        reason: 'WINDOW_SKIPPED',
        discoveryScanned: Number.isInteger(plan.discoveryScannedThrough)
          ? fromBlock - 1 <= plan.discoveryScannedThrough
          : false,
      };
      this.gapRecorder(gap);
      gaps.push(gap);
    }
    assertWriterFenceHeartbeat();

    const processingContext = await this.processorRange(fromBlock, toBlock, budget, { latestBlock });
    assertWriterFenceHeartbeat();
    if (!watchdogStarted && this.writerFence && typeof this.writerFence.renew === 'function') {
      this.writerFence.renew();
    }
    assertWriterFenceHeartbeat();

    lastProcessingContext = processingContext;
    const authorityInput = {
      checkpointCommitted: true,
      fromBlock,
      toBlock,
      blockNumber: toBlock,
    };
    if (processingContext !== undefined) authorityInput.processingContext = processingContext;
    lastAuthorityOutcome = this.authorityGate(authorityInput);
    if (lastAuthorityOutcome?.status !== 'AUTHORIZED') {
      throw new Error('AUTHORITY_ACCEPTANCE_REQUIRED');
    }
    this.cursor.advance(toBlock);
    authorized.push({ fromBlock, toBlock, transitionType: processingContext?.transitionType ?? null });
    processed += toBlock - fromBlock + 1;
  }

  const cursorAfter = this.cursor.get();
  return {
    mode: 'window',
    processed,
    latestBlock,
    safeHead,
    horizon: plan.horizon ?? null,
    cursor: cursorAfter,
    behind: Number.isInteger(cursorAfter) ? Math.max(0, safeHead - cursorAfter) : null,
    segments: authorized,
    gaps,
    plan,
    processingContext: lastProcessingContext,
    authorityOutcome: lastAuthorityOutcome,
  };
};

module.exports = {
  IngestionEngine,
};