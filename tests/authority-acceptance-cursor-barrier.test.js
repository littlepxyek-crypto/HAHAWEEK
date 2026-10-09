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


test('bootstrap cursor remains null when authority does not explicitly accept', async () => {
  const cursor = makeCursor(null);
  let gateInput = null;
  const engine = new IngestionEngine({
    provider: { getBlockNumber: async () => 101 },
    cursor,
    confirmations: 0,
    processor: async () => {},
    authorityGate: input => {
      gateInput = input;
      return { status: 'REJECTED' };
    },
  });

  await assert.rejects(() => engine.runOnce(), /AUTHORITY_ACCEPTANCE_REQUIRED/);
  assert.equal(gateInput?.operation, 'CURSOR_BOOTSTRAP');
  assert.equal(cursor.get(), null);
});


test('ingestion engine rejects missing authority gate before runtime', () => {
  assert.throws(() => new IngestionEngine({
    provider: { getBlockNumber: async () => 101 },
    cursor: makeCursor(100),
    confirmations: 0,
    processor: async () => {},
  }), /AUTHORITY_GATE_REQUIRED/);
});
