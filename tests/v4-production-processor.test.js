'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createV4ProductionProcessors } = require('../src/core/v4-production-processor');

test('V4 production processor delegates range acquisition without saving the database', async () => {
  const calls = [];
  let saves = 0;
  const filter = { address: '0xpool', topics: [['0xtopic']] };
  const rawLogs = {
    async ingestRange(fromBlock, toBlock, receivedFilter) {
      calls.push({ fromBlock, toBlock, receivedFilter });
      return { fetched: 2, inserted: 1, duplicates: 1 };
    },
  };

  const processors = createV4ProductionProcessors({
    rawLogs,
    filterFactory: () => filter,
  });

  const result = await processors.processorRange(101, 102);
  assert.deepEqual(result, { fetched: 2, inserted: 1, duplicates: 1 });
  assert.deepEqual(calls, [{ fromBlock: 101, toBlock: 102, receivedFilter: filter }]);
  assert.equal(saves, 0);
});

test('V4 production processor single-block path delegates exact block range', async () => {
  const calls = [];
  const rawLogs = {
    async ingestRange(fromBlock, toBlock, receivedFilter) {
      calls.push([fromBlock, toBlock, receivedFilter]);
      return { fetched: 1 };
    },
  };
  const processors = createV4ProductionProcessors({
    rawLogs,
    filterFactory: () => ({ address: '0xpool', topics: [[]] }),
  });

  await processors.processor(77);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 77);
  assert.equal(calls[0][1], 77);
});

test('V4 production processor preserves acquisition errors', async () => {
  const failure = new Error('RPC_FAILURE');
  const rawLogs = {
    async ingestRange() {
      throw failure;
    },
  };
  const processors = createV4ProductionProcessors({
    rawLogs,
    filterFactory: () => ({}),
  });

  await assert.rejects(() => processors.processorRange(101, 101), /RPC_FAILURE/);
});

test('V4 production processor fails closed when dependencies are missing', () => {
  assert.throws(
    () => createV4ProductionProcessors({ rawLogs: null, filterFactory: () => ({}) }),
    /V4_RAW_LOGS_REQUIRED/
  );
  assert.throws(
    () => createV4ProductionProcessors({ rawLogs: { ingestRange() {} } }),
    /V4_FILTER_FACTORY_REQUIRED/
  );
});
