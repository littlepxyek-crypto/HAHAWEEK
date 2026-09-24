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
    authority: {
      ...authority,
      bindingDigest: createAuthorityBindingDigest(authority),
    },
    expected: authority,
  };
}

function makeCursor(start = 100) {
  let value = start;
  return {
    get: () => value,
    advance: next => { value = next; },
    initialize: next => { value = next; },
  };
}

function makeEngine({ sourceFactory, cursor = makeCursor() }) {
  const gate = createAuthorityGate({
    authorityFactory: ({fromBlock,toBlock}) => ({...sourceFactory({fromBlock,toBlock}),fromBlock,toBlock}),
    expectedAuthorityFactory: ({fromBlock,toBlock}) => ({...makeAuthority(toBlock).expected,fromBlock,toBlock}),
    authorityValidator: assertProductionAuthority,
    authorityBindingValidator: assertAuthorityBinding,
  });

  return {
    cursor,
    engine: new IngestionEngine({
      provider: { getBlockNumber: async () => 101 },
      cursor,
      confirmations: 0,
      processor: async () => {},
      processorRange: async () => {},
      batchSize: 1,
      maxBatchesPerRun: 1,
      authorityGate: gate,
    }),
  };
}

test('STEP 545 accepts valid cryptographically bound authority at cursor boundary', async () => {
  const { engine, cursor } = makeEngine({
    sourceFactory: () => makeAuthority(101).authority,
  });

  const result = await engine.runOnce();

  assert.equal(result.cursor, 101);
  assert.equal(cursor.get(), 101);
});

test('STEP 545 rejects missing binding before cursor advancement', async () => {
  const source = makeAuthority(101);
  delete source.authority.bindingDigest;

  const { engine, cursor } = makeEngine({
    sourceFactory: () => source.authority,
  });

  await assert.rejects(engine.runOnce(), /AUTHORITY_BINDING_DIGEST_INVALID/);
  assert.equal(cursor.get(), 100);
});

test('STEP 545 rejects tampered binding before cursor advancement', async () => {
  const source = makeAuthority(101);
  source.authority.bindingDigest = 'c'.repeat(64);

  const { engine, cursor } = makeEngine({
    sourceFactory: () => source.authority,
  });

  await assert.rejects(engine.runOnce(), /AUTHORITY_BINDING_CONFLICT/);
  assert.equal(cursor.get(), 100);
});

for (const [field, value, error] of [
  ['segmentId', 'segment-2', 'AUTHORITY_SEGMENTID_BINDING_CONFLICT'],
  ['manifestDigest', 'c'.repeat(64), 'AUTHORITY_MANIFESTDIGEST_BINDING_CONFLICT'],
  ['checkpointDigest', 'c'.repeat(64), 'AUTHORITY_CHECKPOINTDIGEST_BINDING_CONFLICT'],
  ['generation', 'generation-2', 'AUTHORITY_GENERATION_BINDING_CONFLICT'],
  ['cursorBlock', 100, 'AUTHORITY_CURSORBLOCK_BINDING_CONFLICT'],
]) {
  test(`STEP 545 rejects ${field} commitment mismatch before cursor advancement`, async () => {
    const source = makeAuthority(101);
    source.authority[field] = value;

    const { engine, cursor } = makeEngine({
      sourceFactory: () => source,
    });

    await assert.rejects(engine.runOnce(), new RegExp(error));
    assert.equal(cursor.get(), 100);
  });
}

test('STEP 545 identical authority replay is deterministic', async () => {
  const source = makeAuthority(101);
  const { engine, cursor } = makeEngine({
    sourceFactory: () => source,
  });

  const first = await engine.runOnce();
  assert.equal(first.cursor, 101);
  assert.equal(cursor.get(), 101);

  const replayCursor = makeCursor(100);
  const replay = makeEngine({
    sourceFactory: () => source,
    cursor: replayCursor,
  });
  const second = await replay.engine.runOnce();

  assert.equal(second.cursor, 101);
  assert.equal(replayCursor.get(), 101);
});
