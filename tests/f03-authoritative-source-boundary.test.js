'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { IngestionEngine } = require('../src/core/ingestion');
const { createAuthorityGate } = require('../src/core/f03-ingestion-authority-integration');
const {
  createAuthorityBindingDigest,
  assertAuthorityBinding,
} = require('../src/core/f03-authority-binding');
const { assertProductionAuthority } = require('../src/core/f03-production-authority-record');

function makeAuthority(cursorBlock = 101) {
  const authority = {
    segmentId: 'segment-1',
    manifestDigest: 'a'.repeat(64),
    checkpointDigest: 'b'.repeat(64),
    generation: 'generation-1',
    cursorBlock,
  };
  return {
    authority: {...authority, bindingDigest: createAuthorityBindingDigest(authority)},
    expected: authority,
  };
}

function makeEngine({authorityFactory, expectedAuthorityFactory, cursor}) {
  const gate = createAuthorityGate({
    authorityFactory: ({fromBlock,toBlock}) => ({...authorityFactory({fromBlock,toBlock}),fromBlock,toBlock}),
    expectedAuthorityFactory: ({fromBlock,toBlock}) => ({...expectedAuthorityFactory({fromBlock,toBlock}),fromBlock,toBlock}),
    authorityValidator: assertProductionAuthority,
    authorityBindingValidator: assertAuthorityBinding,
  });
  return new IngestionEngine({
    provider: {getBlockNumber: async () => 101},
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async () => {},
    batchSize: 1,
    maxBatchesPerRun: 1,
    authorityGate: gate,
  });
}

function cursor(start = 100) {
  let value = start;
  return {get: () => value, advance: next => {value = next;}};
}

test('STEP 547 accepts independently sourced authority commitments for the exact range', async () => {
  const source = makeAuthority(101);
  const seen = [];
  const c = cursor();
  const engine = makeEngine({
    cursor: c,
    authorityFactory: ({fromBlock,toBlock}) => {
      seen.push(['authority', fromBlock, toBlock]);
      return source.authority;
    },
    expectedAuthorityFactory: ({fromBlock,toBlock}) => {
      seen.push(['expected', fromBlock, toBlock]);
      return {...source.expected};
    },
  });

  const result = await engine.runOnce();

  assert.equal(result.cursor, 101);
  assert.deepEqual(seen, [['authority',101,101],['expected',101,101]]);
});

test('STEP 547 rejects a missing expected source before cursor advancement', async () => {
  const c = cursor();
  const engine = makeEngine({
    cursor: c,
    authorityFactory: () => makeAuthority(101).authority,
    expectedAuthorityFactory: () => undefined,
  });

  await assert.rejects(engine.runOnce(), /AUTHORITY_EXPECTED_SOURCE_INVALID/);
  assert.equal(c.get(), 100);
});

test('STEP 547 rejects self-derived expected authority', async () => {
  const c = cursor();
  const source = makeAuthority(101).authority;
  const engine = makeEngine({
    cursor: c,
    authorityFactory: () => source,
    expectedAuthorityFactory: () => source,
  });

  await assert.rejects(engine.runOnce(), /AUTHORITY_EXPECTED_SOURCE_SELF_REFERENCE/);
  assert.equal(c.get(), 100);
});

test('STEP 547 rejects a range-mismatched expected commitment', async () => {
  const c = cursor();
  const source = makeAuthority(101);
  const engine = makeEngine({
    cursor: c,
    authorityFactory: () => source.authority,
    expectedAuthorityFactory: () => ({...source.expected, fromBlock: 100, toBlock: 100}),
  });

  await assert.rejects(engine.runOnce(), /AUTHORITY_RANGE_MISMATCH/);
  assert.equal(c.get(), 100);
});

test('STEP 547 rejects an incomplete expected commitment', async () => {
  const c = cursor();
  const source = makeAuthority(101);
  const engine = makeEngine({
    cursor: c,
    authorityFactory: () => source.authority,
    expectedAuthorityFactory: () => ({segmentId:'segment-1',cursorBlock:101}),
  });

  await assert.rejects(engine.runOnce(), /AUTHORITY_MANIFESTDIGEST_MISSING/);
  assert.equal(c.get(), 100);
});
