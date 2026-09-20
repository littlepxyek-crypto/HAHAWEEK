'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createV4ProductionFactory } = require('../src/core/v4-production-factory');

test('V4 production factory fails closed when database or provider is missing', () => {
  assert.throws(() => createV4ProductionFactory({}), /V4_DATABASE_REQUIRED/);
  assert.throws(() => createV4ProductionFactory({ database: { db: {} } }), /PROVIDER_REQUIRED/);
});

test('V4 production factory constructs the processor and engine from explicit dependencies', () => {
  const database = { db: {}, transactionAsync() {}, transaction() {} };
  const provider = { getBlockNumber() {} };
  const rawLogs = { ingestRange() {} };
  const filter = { address: '0xpool', topics: [[]] };

  const factory = createV4ProductionFactory({
    database,
    provider,
    confirmations: 0,
    rawLogs,
    filterFactory: () => filter,
    batchSize: 1,
  });

  assert.equal(typeof factory.processors.processor, 'function');
  assert.equal(typeof factory.processors.processorRange, 'function');
  assert.equal(typeof factory.createEngine, 'function');
});

test('V4 production factory does not accept a missing raw-log boundary', () => {
  const database = { db: {} };
  const provider = { getBlockNumber() {} };
  assert.throws(
    () => createV4ProductionFactory({
      database,
      provider,
      confirmations: 0,
      filterFactory: () => ({}),
      batchSize: 1,
    }),
    /V4_RAW_LOGS_REQUIRED/
  );
});
