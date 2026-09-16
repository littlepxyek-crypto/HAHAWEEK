'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { IngestionEngine } = require('../src/core/ingestion');
const { rpcCall } = require('../src/core/rpc-call');

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

test('RPC retry allows ingestion to continue after transient failure', async () => {
  const cursor = makeCursor(100);
  const processed = [];

  let attempts = 0;

  const provider = {
    async getBlockNumber() {
      attempts += 1;

      if (attempts === 1) {
        throw new Error('TRANSIENT_RPC_FAILURE');
      }

      return 103;
    },
  };

  const engine = new IngestionEngine({
    provider,
    cursor,
    confirmations: 0,
    processor: async (block) => {
      processed.push(block);
    },
  });

  const result = await engine.runOnce();

  assert.equal(attempts, 2);
  assert.deepEqual(processed, [101, 102, 103]);
  assert.equal(result.processed, 3);
  assert.equal(result.cursor, 103);
});

test('final RPC failure prevents ingestion from advancing cursor', async () => {
  const cursor = makeCursor(100);
  const processed = [];

  const provider = {
    async getBlockNumber() {
      throw new Error('PERMANENT_RPC_FAILURE');
    },
  };

  const engine = new IngestionEngine({
    provider,
    cursor,
    confirmations: 0,
    processor: async (block) => {
      processed.push(block);
    },
  });

  await assert.rejects(
    () => engine.runOnce(),
    /PERMANENT_RPC_FAILURE/
  );

  assert.deepEqual(processed, []);
  assert.equal(cursor.get(), 100);
});
