'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { IngestionEngine } = require('../src/core/ingestion');

function makeCursor(initialBlock = null) {
  let value = initialBlock;

  return {
    get() {
      return value;
    },

    initialize(block) {
      if (value !== null) return value;
      value = block;
      return value;
    },

    advance(block) {
      if (value !== null && block < value) {
        throw new Error('BLOCK_CURSOR_REGRESSION');
      }

      value = block;
      return value;
    },
  };
}

test('bounded recovery stops after configured batch limit and resumes next run', async () => {
  const cursor = makeCursor(100);
  const ranges = [];

  const provider = {
    async getBlockNumber() {
      return 120;
    },
  };

  const engine = new IngestionEngine({
    provider,
    cursor,
    confirmations: 0,
    processor: async () => {},
    batchSize: 5,
    maxBatchesPerRun: 2,
    processorRange: async (fromBlock, toBlock) => {
      ranges.push([fromBlock, toBlock]);
    },
  });

  const first = await engine.runOnce();

  assert.deepEqual(ranges, [
    [101, 105],
    [106, 110],
  ]);

  assert.equal(first.processed, 10);
  assert.equal(first.cursor, 110);
  assert.equal(cursor.get(), 110);

  const second = await engine.runOnce();

  assert.deepEqual(ranges, [
    [101, 105],
    [106, 110],
    [111, 115],
    [116, 120],
  ]);

  assert.equal(second.processed, 10);
  assert.equal(second.cursor, 120);
  assert.equal(cursor.get(), 120);
});

test('bounded recovery preserves cursor when a batch fails and remains bounded on retry', async () => {
  const cursor = makeCursor(100);
  const ranges = [];
  let failedOnce = false;

  const provider = {
    async getBlockNumber() {
      return 120;
    },
  };

  const engine = new IngestionEngine({
    provider,
    cursor,
    confirmations: 0,
    processor: async () => {},
    batchSize: 5,
    maxBatchesPerRun: 2,
    processorRange: async (fromBlock, toBlock) => {
      ranges.push([fromBlock, toBlock]);

      if (fromBlock === 106 && !failedOnce) {
        failedOnce = true;
        throw new Error('BOUNDED_BATCH_FAILURE');
      }
    },
  });

  await assert.rejects(
    () => engine.runOnce(),
    /BOUNDED_BATCH_FAILURE/
  );

  assert.deepEqual(ranges, [
    [101, 105],
    [106, 110],
  ]);

  assert.equal(cursor.get(), 105);

  const second = await engine.runOnce();

  assert.deepEqual(ranges, [
    [101, 105],
    [106, 110],
    [106, 110],
    [111, 115],
  ]);

  assert.equal(second.processed, 10);
  assert.equal(second.cursor, 115);
  assert.equal(cursor.get(), 115);

  const third = await engine.runOnce();

  assert.deepEqual(ranges, [
    [101, 105],
    [106, 110],
    [106, 110],
    [111, 115],
    [116, 120],
  ]);

  assert.equal(third.processed, 5);
  assert.equal(third.cursor, 120);
  assert.equal(cursor.get(), 120);
});
