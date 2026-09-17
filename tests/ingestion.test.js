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
      provider: {},
    }),
    /CURSOR_REQUIRED/
  );

  assert.throws(
    () => new IngestionEngine({
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
      provider,
      cursor,
      confirmations: -1,
      processor,
    }),
    /INVALID_CONFIRMATIONS/
  );

  assert.throws(
    () => new IngestionEngine({
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

test('failed batch does not advance cursor', async () => {
  const cursor = makeCursor(100);

  const provider = {
    async getBlockNumber() {
      return 110;
    },
  };

  const engine = new IngestionEngine({
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
