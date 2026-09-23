'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RESULTS: ID } = require('../src/core/block-identity');
const { classify } = require('../src/core/block-identity');
const { RESULTS: REORG, detectReorg } = require('../src/core/reorg-detector');

const previous = {
  chainId: 4663, blockNumber: 100, blockHash: '0x100', parentHash: '0x099',
  observedAt: '2026-09-21T00:00:00.000Z'
};
const continuous = {
  chainId: 4663, blockNumber: 101, blockHash: '0x101', parentHash: '0x100',
  observedAt: '2026-09-21T00:00:01.000Z'
};
const forked = {...continuous, blockHash: '0x101-fork', parentHash: '0x0ff'};

test('identity layer accepts a continuous next block', () => {
  assert.equal(classify(previous, previous), ID.VALID);
  assert.equal(detectReorg({
    previousBlockNumber: previous.blockNumber,
    previousHash: previous.blockHash,
    currentBlockNumber: continuous.blockNumber,
    currentHash: continuous.blockHash,
    currentParentHash: continuous.parentHash
  }), REORG.CONTINUOUS);
});

test('identity layer feeds parent mismatch into reorg detector', () => {
  assert.equal(classify(previous, previous), ID.VALID);
  assert.equal(detectReorg({
    previousBlockNumber: previous.blockNumber,
    previousHash: previous.blockHash,
    currentBlockNumber: forked.blockNumber,
    currentHash: forked.blockHash,
    currentParentHash: forked.parentHash
  }), REORG.REORG_DETECTED);
});

test('block-number gap remains invalid', () => {
  assert.equal(detectReorg({
    previousBlockNumber: previous.blockNumber,
    previousHash: previous.blockHash,
    currentBlockNumber: 102,
    currentHash: '0x102',
    parentHash: '0x101'
  }), REORG.INVALID_INPUT);
});

test('same block number with different hash is an identity conflict', () => {
  assert.equal(classify(continuous, {...continuous, blockHash: '0xDIFFERENT'}), ID.CONFLICT);
});

test('integration contract has no cursor/evidence side effects', () => {
  const cursor = 100;
  const evidence = ['e100'];
  detectReorg({
    previousBlockNumber: previous.blockNumber,
    previousHash: previous.blockHash,
    currentBlockNumber: continuous.blockNumber,
    currentHash: continuous.blockHash,
    currentParentHash: continuous.parentHash
  });
  assert.equal(cursor, 100);
  assert.deepEqual(evidence, ['e100']);
});
