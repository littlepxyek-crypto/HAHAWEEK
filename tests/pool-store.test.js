'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createDatabase } = require('../src/core/database');
const { createPoolStore } = require('../src/core/pool-store');

function samplePool() {
  return {
    poolId: '0x' + 'ab'.repeat(32),
    chainId: 4663,
    poolManager: '0x8366a39cc670b4001a1121b8f6a443a643e40951',
    currency0: '0x0000000000000000000000000000000000000000',
    currency1: '0x' + '11'.repeat(20),
    fee: 3000,
    tickSpacing: 60,
    hooks: '0x0000000000000000000000000000000000000000',
    blockNumber: 123456,
    transactionHash: '0x' + 'cd'.repeat(32),
    logIndex: 7,
    createdAt: '2026-09-16T00:00:00.000Z',
  };
}

test('pool inserts exactly once', async () => {
  const database = await createDatabase(':memory:');
  const store = createPoolStore(database.db);
  const pool = samplePool();

  const first = store.insert(pool);
  const second = store.insert(pool);

  assert.equal(first.inserted, true);
  assert.equal(second.inserted, false);
  assert.equal(store.count(), 1);

  database.close();
});

test('pool survives database reload', async () => {
  const filename = `${process.cwd()}/data/test-pool-${Date.now()}.sqlite`;

  const firstDb = await createDatabase(filename);
  const firstStore = createPoolStore(firstDb.db);

  firstStore.insert(samplePool());
  firstDb.save();
  firstDb.close();

  const secondDb = await createDatabase(filename);
  const secondStore = createPoolStore(secondDb.db);

  const restored = secondStore.get(samplePool().poolId);

  assert.ok(restored);
  assert.equal(restored.chainId, 4663);
  assert.equal(restored.blockNumber, 123456);
  assert.equal(restored.transactionHash, samplePool().transactionHash);
  assert.equal(restored.logIndex, 7);

  secondDb.close();

  const fs = require('node:fs');
  fs.rmSync(filename, { force: true });
});

test('different pools remain distinct', async () => {
  const database = await createDatabase(':memory:');
  const store = createPoolStore(database.db);

  const a = samplePool();
  const b = {
    ...samplePool(),
    poolId: '0x' + 'ef'.repeat(32),
  };

  store.insert(a);
  store.insert(b);

  assert.equal(store.count(), 2);
  assert.ok(store.get(a.poolId));
  assert.ok(store.get(b.poolId));

  database.close();
});
