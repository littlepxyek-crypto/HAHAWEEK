'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { IngestionEngine } = require('../src/core/ingestion');
const { createAuthorityGate } = require('../src/core/f03-ingestion-authority-integration');
const { assertProductionAuthority } = require('../src/core/f03-production-authority-record');

function makeEngine(authorityFactory, cursor) {
  return new IngestionEngine({
    provider: { getBlockNumber: async () => 101 },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async () => {},
    batchSize: 1,
    maxBatchesPerRun: 1,
    authorityGate: createAuthorityGate({
      authorityFactory,
      authorityValidator: assertProductionAuthority,
      authorityBindingValidator: () => ({status:'BOUND'}),
    }),
  });
}

test('F-03 production boundary fails closed and preserves cursor on authority rejection', async () => {
  let cursorValue = 100;
  const advances = [];
  const cursor = {
    get: () => cursorValue,
    advance: (block) => {
      advances.push(block);
      cursorValue = block;
    },
  };

  const engine = makeEngine(() => {
    throw new Error('AUTHORITY_REJECTED');
  }, cursor);

  await assert.rejects(() => engine.runOnce(), /AUTHORITY_REJECTED/);
  assert.equal(cursorValue, 100);
  assert.deepEqual(advances, []);
});

test('F-03 production boundary can retry the same authority range after rejection', async () => {
  let cursorValue = 100;
  let reject = true;
  const seen = [];
  const cursor = {
    get: () => cursorValue,
    advance: (block) => {
      cursorValue = block;
    },
  };

  const engine = makeEngine(({ fromBlock, toBlock }) => {
    seen.push([fromBlock, toBlock]);
    if (reject) throw new Error('AUTHORITY_REJECTED');
    const authority={
      segmentId: `seg-${fromBlock}-${toBlock}`,
      manifestDigest: 'm101',
      checkpointDigest: 'c101',
      generation: 'g1',
      cursorBlock: toBlock,
    };
    return {authority,expected:authority};
  }, cursor);

  await assert.rejects(() => engine.runOnce(), /AUTHORITY_REJECTED/);
  assert.equal(cursorValue, 100);

  reject = false;
  const result = await engine.runOnce();

  assert.equal(result.cursor, 101);
  assert.equal(cursorValue, 101);
  assert.deepEqual(seen, [[101, 101], [101, 101]]);
});
