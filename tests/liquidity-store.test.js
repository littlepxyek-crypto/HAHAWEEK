'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createDatabase } = require('../src/core/database');
const { createLiquidityStore } = require('../src/core/liquidity-store');

function sampleEvent() {
  return {
    identity: '4663:123456:0x' + 'aa'.repeat(32) + ':7',
    chainId: 4663,
    poolId: '0x' + 'bb'.repeat(32),
    poolManager: '0x8366a39cc670b4001a1121b8f6a443a643e40951',
    sender: '0x' + 'cc'.repeat(20),
    tickLower: -887220,
    tickUpper: 887220,
    liquidityDelta: '1000000000000000000000',
    salt: '0x' + '00'.repeat(32),
    blockNumber: 123456,
    transactionHash: '0x' + 'aa'.repeat(32),
    logIndex: 7,
    capturedAt: '2026-09-16T00:00:00.000Z',
  };
}

test('liquidity event inserts exactly once', async () => {
  const database = await createDatabase(':memory:');
  const store = createLiquidityStore(database.db);
  const event = sampleEvent();

  const first = store.insert(event);
  const second = store.insert(event);

  assert.equal(first.inserted, true);
  assert.equal(second.inserted, false);
  assert.equal(store.count(), 1);

  database.close();
});

test('liquidity event survives database reload', async () => {
  const filename =
    `${process.cwd()}/data/test-liquidity-${Date.now()}.sqlite`;

  const firstDb = await createDatabase(filename);
  const firstStore = createLiquidityStore(firstDb.db);
  const event = sampleEvent();

  firstStore.insert(event);
  firstDb.save();
  firstDb.close();

  const secondDb = await createDatabase(filename);
  const secondStore = createLiquidityStore(secondDb.db);

  const restored = secondStore.get(event.identity);

  assert.ok(restored);
  assert.equal(restored.chainId, event.chainId);
  assert.equal(restored.poolId, event.poolId.toLowerCase());
  assert.equal(restored.liquidityDelta, event.liquidityDelta);
  assert.equal(restored.blockNumber, event.blockNumber);
  assert.equal(restored.transactionHash, event.transactionHash);
  assert.equal(restored.logIndex, event.logIndex);

  secondDb.close();

  const fs = require('node:fs');
  fs.rmSync(filename, { force: true });
});

test('different liquidity events remain distinct', async () => {
  const database = await createDatabase(':memory:');
  const store = createLiquidityStore(database.db);

  const a = sampleEvent();
  const b = {
    ...sampleEvent(),
    identity: '4663:123457:0x' + 'dd'.repeat(32) + ':8',
    blockNumber: 123457,
    transactionHash: '0x' + 'dd'.repeat(32),
    logIndex: 8,
  };

  store.insert(a);
  store.insert(b);

  assert.equal(store.count(), 2);
  assert.ok(store.get(a.identity));
  assert.ok(store.get(b.identity));

  database.close();
});
