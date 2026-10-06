'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { IngestionEngine } = require('../src/core/ingestion');
const { createAuthorityGate } = require('../src/core/f03-ingestion-authority-integration');
const { assertProductionAuthority } = require('../src/core/f03-production-authority-record');

function makeEngine(authorityFactory, expectedAuthorityFactory, cursor) {
  return new IngestionEngine({
    provider: { getBlockNumber: async () => 101 },
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async () => {},
    batchSize: 1,
    maxBatchesPerRun: 1,
    authorityGate: createAuthorityGate({
      authorityFactory: ({fromBlock,toBlock}) => ({...authorityFactory({fromBlock,toBlock}),fromBlock,toBlock}),
      expectedAuthorityFactory: ({fromBlock,toBlock}) => ({...expectedAuthorityFactory({fromBlock,toBlock}),fromBlock,toBlock}),
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
  }, () => ({segmentId:'seg',manifestDigest:'m',checkpointDigest:'c',generation:'g1',cursorBlock:101}), cursor);

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
    return authority;
  }, ({toBlock}) => ({segmentId:'seg-expected',manifestDigest:'m101',checkpointDigest:'c101',generation:'g1',cursorBlock:toBlock}), cursor);

  await assert.rejects(() => engine.runOnce(), /AUTHORITY_REJECTED/);
  assert.equal(cursorValue, 100);

  reject = false;
  const result = await engine.runOnce();

  assert.equal(result.cursor, 101);
  assert.equal(cursorValue, 101);
  assert.deepEqual(seen, [[101, 101], [101, 101]]);
});

test('F-03 lifecycle committer is not reached when final authority validation rejects', () => {
  let commits = 0;

  const authority = {
    fromBlock: 101,
    toBlock: 101,
    segmentId: 'seg-101',
    manifestDigest: 'm101',
    checkpointDigest: 'c101',
    generation: 'g1',
    cursorBlock: 101,
  };

  const expected = {
    fromBlock: 101,
    toBlock: 101,
    segmentId: 'seg-101',
    manifestDigest: 'm101',
    checkpointDigest: 'c101',
    generation: 'g1',
    cursorBlock: 101,
  };

  const gate = createAuthorityGate({
    authorityFactory: () => authority,
    expectedAuthorityFactory: () => expected,
    authorityValidator: () => {
      throw new Error('FINAL_AUTHORITY_VALIDATION_REJECTED');
    },
    authorityBindingValidator: () => ({ status: 'BOUND' }),
    authorityCommitter: () => {
      commits += 1;
    },
  });

  assert.throws(
    () => gate({
      checkpointCommitted: true,
      fromBlock: 101,
      toBlock: 101,
      processingContext: {
        status: 'VERIFIED',
        fromBlock: 101,
        toBlock: 101,
        generation: 'g1',
      },
    }),
    /FINAL_AUTHORITY_VALIDATION_REJECTED/
  );

  assert.equal(commits, 0);
});
