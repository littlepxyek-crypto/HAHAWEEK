'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { IngestionEngine } = require('../src/core/ingestion');

function makeCursor(initial = null) {
  let value = initial;

  return {
    get() {
      return value;
    },

    initialize(block) {
      value = block;
      return block;
    },

    advance(block) {
      value = block;
      return block;
    },
  };
}

function makeProvider(head) {
  return {
    async getBlockNumber() {
      return head;
    },
  };
}

test('initial run starts at safe head without processing history', async () => {
  const cursor = makeCursor();
  const processed = [];

  const engine = new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
    provider: makeProvider(100),
    cursor,
    confirmations: 3,
    processor: async (block) => {
      processed.push(block);
    },
  });

  const result = await engine.runOnce();

  assert.equal(result.latestBlock, 100);
  assert.equal(result.safeHead, 97);
  assert.equal(result.cursor, 97);
  assert.equal(result.processed, 0);
  assert.deepEqual(processed, []);
});

test('blocks are processed sequentially', async () => {
  const cursor = makeCursor(100);
  const processed = [];

  const engine = new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
    provider: makeProvider(106),
    cursor,
    confirmations: 3,
    processor: async (block) => {
      processed.push(block);
    },
  });

  const result = await engine.runOnce();

  assert.deepEqual(processed, [101, 102, 103]);
  assert.equal(result.processed, 3);
  assert.equal(result.cursor, 103);
});

test('cursor advances only after successful processing', async () => {
  const cursor = makeCursor(100);

  const engine = new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
    provider: makeProvider(103),
    cursor,
    confirmations: 0,
    processor: async (block) => {
      if (block === 102) {
        throw new Error('PROCESSOR_FAILED');
      }
    },
  });

  await assert.rejects(
    () => engine.runOnce(),
    /PROCESSOR_FAILED/
  );

  assert.equal(cursor.get(), 101);
});

test('restart resumes from persisted cursor', async () => {
  const cursor = makeCursor(101);
  const processed = [];

  const engine = new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
    provider: makeProvider(103),
    cursor,
    confirmations: 0,
    processor: async (block) => {
      processed.push(block);
    },
  });

  const result = await engine.runOnce();

  assert.deepEqual(processed, [102, 103]);
  assert.equal(result.cursor, 103);
});

test('no processing occurs when cursor reaches safe head', async () => {
  const cursor = makeCursor(100);
  const processed = [];

  const engine = new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
    provider: makeProvider(100),
    cursor,
    confirmations: 3,
    processor: async (block) => {
      processed.push(block);
    },
  });

  const result = await engine.runOnce();

  assert.equal(result.processed, 0);
  assert.deepEqual(processed, []);
  assert.equal(result.cursor, 100);
});

test('constructor rejects missing dependencies', () => {
  assert.throws(
    () => new IngestionEngine({}),
    /PROVIDER_REQUIRED/
  );

  assert.throws(
    () => new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
      provider: {},
    }),
    /CURSOR_REQUIRED/
  );

  assert.throws(
    () => new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
      provider: {},
      cursor: {},
    }),
    /PROCESSOR_REQUIRED/
  );
});

test('constructor rejects invalid confirmations', () => {
  const provider = makeProvider(100);
  const cursor = makeCursor(100);
  const processor = async () => {};

  assert.throws(
    () => new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
      provider,
      cursor,
      confirmations: -1,
      processor,
    }),
    /INVALID_CONFIRMATIONS/
  );

  assert.throws(
    () => new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
      provider,
      cursor,
      confirmations: 1.5,
      processor,
    }),
    /INVALID_CONFIRMATIONS/
  );
});

test('range processor advances cursor only after successful batch', async () => {
  const cursor = makeCursor(100);
  const processedRanges = [];

  const provider = {
    async getBlockNumber() {
      return 110;
    },
  };

  const engine = new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
    provider,
    cursor,
    confirmations: 0,
    processor: async (block) => {
      throw new Error('SINGLE_BLOCK_PROCESSOR_SHOULD_NOT_RUN');
    },
    processorRange: async (fromBlock, toBlock) => {
      processedRanges.push([fromBlock, toBlock]);
    },
    batchSize: 5,
  });

  const result = await engine.runOnce();

  assert.deepEqual(processedRanges, [
    [101, 105],
    [106, 110],
  ]);

  assert.equal(result.processed, 10);
  assert.equal(result.cursor, 110);
  assert.equal(cursor.get(), 110);
});

test('writer fence is renewed during a long-running batch', async () => {
  const cursor = makeCursor(100);
  let renewals = 0;
  const writerFence = { renew() { renewals += 1; }, assertOwned() {}, getLeaseMs() { return 30; } };
  const engine = new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
    provider: makeProvider(101), cursor, confirmations: 0, processor: async () => {},
    processorRange: async () => { await new Promise(resolve => setTimeout(resolve, 70)); },
    batchSize: 1, writerFence,
  });
  const result = await engine.runOnce();
  assert.equal(result.cursor, 101);
  assert.ok(renewals >= 2);
});

test('writer fence is renewed at batch boundaries', async () => {
  const cursor = makeCursor(100);
  const renewals = [];
  const writerFence = {
    renew() { renewals.push(Date.now()); },
    assertOwned() {},
    getLeaseMs() { return 30_000; },
  };

  const engine = new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
    provider: makeProvider(102),
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async () => {},
    batchSize: 1,
    writerFence,
  });

  const result = await engine.runOnce();

  assert.equal(result.cursor, 102);
  assert.equal(renewals.length, 4);
});

test('watchdog owns renewal when available and avoids main-thread fence contention', async () => {
  const cursor = makeCursor(100);
  let renewals = 0;
  let watchdogStarts = 0;
  let watchdogStops = 0;
  const writerFence = {
    renew() {
      renewals += 1;
      throw new Error('MAIN_THREAD_RENEW_SHOULD_NOT_RUN');
    },
    assertOwned() {},
    getLeaseMs() { return 30_000; },
    async startWatchdog() {
      watchdogStarts += 1;
    },
    async stopWatchdog() {
      watchdogStops += 1;
    },
  };

  const engine = new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
    provider: makeProvider(101),
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async () => {},
    batchSize: 1,
    writerFence,
  });

  const result = await engine.runOnce();

  assert.equal(result.cursor, 101);
  assert.equal(renewals, 0);
  assert.equal(watchdogStarts, 1);
  assert.equal(watchdogStops, 1);
});

test('writer fence boundary renewal failure fails closed before cursor advance', async () => {
  const cursor = makeCursor(100);
  let renewals = 0;
  const writerFence = {
    renew() {
      renewals += 1;
      throw new Error('WRITER_FENCE_BOUNDARY_RENEW_FAILED');
    },
    assertOwned() {},
    getLeaseMs() { return 30_000; },
  };

  const engine = new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
    provider: makeProvider(101),
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async () => {},
    batchSize: 1,
    writerFence,
  });

  await assert.rejects(
    () => engine.runOnce(),
    /WRITER_FENCE_BOUNDARY_RENEW_FAILED/
  );

  assert.equal(renewals, 1);
  assert.equal(cursor.get(), 100);
});

test('writer fence renewal failure fails closed without advancing cursor', async () => {
  const cursor = makeCursor(100);
  let renewals = 0;
  const writerFence = {
    renew() { renewals += 1; throw new Error('WRITER_FENCE_RENEW_FAILED'); },
    assertOwned() {},
    getLeaseMs() { return 20; },
  };
  const engine = new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
    provider: makeProvider(101), cursor, confirmations: 0, processor: async () => {},
    processorRange: async () => { await new Promise(resolve => setTimeout(resolve, 40)); },
    batchSize: 1, writerFence,
  });
  await assert.rejects(() => engine.runOnce(), /WRITER_FENCE_RENEW_FAILED/);
  assert.equal(renewals >= 1, true);
  assert.equal(cursor.get(), 100);
});

test('failed batch does not advance cursor', async () => {
  const cursor = makeCursor(100);

  const provider = {
    async getBlockNumber() {
      return 110;
    },
  };

  const engine = new IngestionEngine({
    authorityGate: () => ({ status: 'AUTHORIZED' }),
    provider,
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async () => {
      throw new Error('BATCH_FAILURE');
    },
    batchSize: 5,
  });

  await assert.rejects(
    () => engine.runOnce(),
    /BATCH_FAILURE/
  );

  assert.equal(cursor.get(), 100);
});