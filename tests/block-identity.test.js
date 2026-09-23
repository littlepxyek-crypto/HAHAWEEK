'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RESULTS, validateBlockIdentity, identityKey, sameIdentity, classify
} = require('../src/core/block-identity');

const base = {
  chainId: 4663,
  blockNumber: 101,
  blockHash: '0xbbb',
  parentHash: '0xaaa',
  observedAt: '2026-09-21T00:00:01.000Z'
};

test('valid identity', () => assert.equal(validateBlockIdentity(base), RESULTS.VALID));
test('golden invalid inputs', () => {
  assert.equal(validateBlockIdentity({...base, chainId: 0}), RESULTS.INVALID_INPUT);
  assert.equal(validateBlockIdentity({...base, blockNumber: -1}), RESULTS.INVALID_INPUT);
  assert.equal(validateBlockIdentity({...base, blockHash: ''}), RESULTS.INVALID_INPUT);
  assert.equal(validateBlockIdentity({...base, parentHash: ''}), RESULTS.INVALID_INPUT);
  assert.equal(validateBlockIdentity({...base, observedAt: ''}), RESULTS.INVALID_INPUT);
});
test('identity key is deterministic', () => {
  assert.equal(identityKey(base), '4663:101');
  assert.equal(identityKey(base), identityKey({...base, observedAt: 'later'}));
});
test('same committed identity is idempotent', () => {
  assert.equal(sameIdentity(base, {...base, observedAt: 'later'}), true);
  assert.equal(classify(base, {...base, observedAt: 'later'}), RESULTS.VALID);
});
test('same block number with different hash is conflict', () => {
  assert.equal(classify(base, {...base, blockHash: '0xccc'}), RESULTS.CONFLICT);
});
test('different block identity is not a conflict', () => {
  assert.equal(classify(base, {...base, blockNumber: 102, blockHash: '0xccc'}), RESULTS.VALID);
});
test('identity helpers do not mutate inputs', () => {
  const before = JSON.stringify(base);
  validateBlockIdentity(base);
  identityKey(base);
  sameIdentity(base, {...base});
  classify(base, {...base});
  assert.equal(JSON.stringify(base), before);
});
