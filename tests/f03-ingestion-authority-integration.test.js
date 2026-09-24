'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createAuthorityGate } = require('../src/core/f03-ingestion-authority-integration');
const { assertProductionAuthority } = require('../src/core/f03-production-authority-record');
const { assertAuthorityBinding, createAuthorityBindingDigest } = require('../src/core/f03-authority-binding');

function makeSource(cursorBlock = 110) {
  const expected = {
    segmentId: 'segment:' + cursorBlock,
    manifestDigest: 'manifest-digest-' + cursorBlock,
    checkpointDigest: 'checkpoint-digest-' + cursorBlock,
    generation: 'g1',
    cursorBlock,
  };

  return {
    authority: {
      ...expected,
      bindingDigest: createAuthorityBindingDigest(expected),
    },
    expected,
  };
}

function makeGate(factory) {
  return createAuthorityGate({
    authorityFactory: ({fromBlock,toBlock}) => ({...factory({fromBlock,toBlock}),fromBlock,toBlock}),
    expectedAuthorityFactory: ({fromBlock,toBlock}) => ({...makeSource(toBlock).expected,fromBlock,toBlock}),
    authorityValidator: assertProductionAuthority,
    authorityBindingValidator: assertAuthorityBinding,
  });
}

test('F-03 production boundary adapter validates complete cryptographically bound authority before cursor', () => {
  const gate = makeGate(() => makeSource(110).authority);
  assert.equal(
    gate({fromBlock:101,toBlock:110,checkpointCommitted:true}).status,
    'AUTHORIZED'
  );
});

test('F-03 adapter fails closed when authority is incomplete', () => {
  const source = makeSource(110);
  delete source.authority.manifestDigest;

  const gate = makeGate(() => source.authority);
  assert.throws(
    () => gate({fromBlock:101,toBlock:110,checkpointCommitted:true}),
    /AUTHORITY_MANIFESTDIGEST_MISSING/
  );
});

test('F-03 adapter fails closed when expected source is missing', () => {
  const gate = createAuthorityGate({
    authorityFactory: () => makeSource(110).authority,
    expectedAuthorityFactory: () => undefined,
    authorityValidator: assertProductionAuthority,
    authorityBindingValidator: assertAuthorityBinding,
  });
  assert.throws(
    () => gate({fromBlock:101,toBlock:110,checkpointCommitted:true}),
    /AUTHORITY_EXPECTED_SOURCE_INVALID/
  );
});

test('F-03 adapter rejects checkpoint before authority construction', () => {
  const gate = makeGate(() => {
    throw new Error('MUST_NOT_BE_CALLED');
  });
  assert.throws(
    () => gate({fromBlock:101,toBlock:110,checkpointCommitted:false}),
    /CHECKPOINT_NOT_COMMITTED/
  );
});

test('F-03 adapter rejects a valid structural authority with a tampered binding', () => {
  const source = makeSource(110);
  source.authority.bindingDigest = 'c'.repeat(64);

  const gate = makeGate(() => source.authority);
  assert.throws(
    () => gate({fromBlock:101,toBlock:110,checkpointCommitted:true}),
    /AUTHORITY_BINDING_CONFLICT/
  );
});
