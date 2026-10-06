'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { IngestionEngine } = require('../src/core/ingestion');

function makeCursor(initialBlock) {
  let value = initialBlock;
  return {
    get: () => value,
    initialize: block => { value = block; return value; },
    advance: block => { value = block; return value; },
  };
}

test('batch cursor does not advance when authority does not explicitly accept', async () => {
  const cursor = makeCursor(100);
  const engine = new IngestionEngine({
    provider: { getBlockNumber: async () => 101 },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async () => ({ status: 'VERIFIED', fromBlock: 101, toBlock: 101, generation: 'g1' }),
    batchSize: 1,
    maxBatchesPerRun: 1,
    authorityGate: () => ({ status: 'REJECTED' }),
  });

  await assert.rejects(() => engine.runOnce(), /AUTHORITY_ACCEPTANCE_REQUIRED/);
  assert.equal(cursor.get(), 100);
});

test('batch cursor advances only after explicit authority acceptance', async () => {
  const cursor = makeCursor(100);
  const engine = new IngestionEngine({
    provider: { getBlockNumber: async () => 101 },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async () => ({ status: 'VERIFIED', fromBlock: 101, toBlock: 101, generation: 'g1' }),
    batchSize: 1,
    maxBatchesPerRun: 1,
    authorityGate: () => ({ status: 'AUTHORIZED' }),
  });

  const result = await engine.runOnce();
  assert.equal(result.cursor, 101);
  assert.equal(cursor.get(), 101);
});

test('legacy cursor does not advance when explicit authority acceptance is absent', async () => {
  const cursor = makeCursor(100);
  const engine = new IngestionEngine({
    provider: { getBlockNumber: async () => 101 },
    cursor,
    confirmations: 0,
    processor: async () => {},
    authorityGate: () => ({ status: 'VERIFIED' }),
  });

  await assert.rejects(() => engine.runOnce(), /AUTHORITY_ACCEPTANCE_REQUIRED/);
  assert.equal(cursor.get(), 100);
});
