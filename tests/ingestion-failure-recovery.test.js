'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { IngestionEngine } = require('../src/core/ingestion');

function makeCursor(initialBlock) {
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

test('processor failure does not advance cursor past failed block', async () => {
  const cursor = makeCursor(100);
  const processed = [];

  let failedOnce = false;

  const provider = {
    async getBlockNumber() {
      return 103;
    },
  };

  const engine = new IngestionEngine({
    provider,
    cursor,
    confirmations: 0,
    processor: async (block) => {
      processed.push(block);

      if (block === 102 && !failedOnce) {
        failedOnce = true;
        throw new Error('PROCESSOR_FAILURE');
      }
    },
  });

  await assert.rejects(
    () => engine.runOnce(),
    /PROCESSOR_FAILURE/
  );

  assert.deepEqual(processed, [101, 102]);
  assert.equal(cursor.get(), 101);

  const result = await engine.runOnce();

  assert.deepEqual(processed, [101, 102, 102, 103]);
  assert.equal(result.processed, 2);
  assert.equal(cursor.get(), 103);
});
