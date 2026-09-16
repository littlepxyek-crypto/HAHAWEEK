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
      value = block;
      return value;
    },
  };
}

test('concurrent runOnce calls are rejected', async () => {
  const cursor = makeCursor(100);

  let releaseProcessor;

  const processorBlocked = new Promise((resolve) => {
    releaseProcessor = resolve;
  });

  let processingStarted = false;

  const provider = {
    async getBlockNumber() {
      return 101;
    },
  };

  const engine = new IngestionEngine({
    provider,
    cursor,
    confirmations: 0,
    processor: async () => {
      processingStarted = true;
      await processorBlocked;
    },
  });

  const firstRun = engine.runOnce();

  while (!processingStarted) {
    await new Promise((resolve) => setImmediate(resolve));
  }

  const secondRun = engine.runOnce();

  await assert.rejects(
    Promise.race([
      secondRun,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('OVERLAP_TEST_TIMEOUT')),
          1000
        )
      ),
    ]),
    /INGESTION_ALREADY_RUNNING/
  );

  releaseProcessor();
  await firstRun;

  assert.equal(cursor.get(), 101);
});
