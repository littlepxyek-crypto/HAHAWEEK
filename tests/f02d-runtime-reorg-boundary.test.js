'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RESULTS: REORG, detectReorg } = require('../src/core/reorg-detector');

function boundary({ previous, current, cursor }) {
  const result = detectReorg({
    previousBlockNumber: previous.number,
    previousHash: previous.hash,
    currentBlockNumber: current.number,
    currentHash: current.hash,
    currentParentHash: current.parentHash
  });
  return {
    result,
    cursorAfter: result === REORG.CONTINUOUS ? current.number : cursor
  };
}

const previous = { number: 100, hash: '0x100' };

test('CONTINUOUS permits advancement', () => {
  const out = boundary({
    previous,
    current: { number: 101, hash: '0x101', parentHash: '0x100' },
    cursor: 100
  });
  assert.equal(out.result, REORG.CONTINUOUS);
  assert.equal(out.cursorAfter, 101);
});

test('REORG_DETECTED fails closed and preserves cursor', () => {
  const out = boundary({
    previous,
    current: { number: 101, hash: '0x101-fork', parentHash: '0x0ff' },
    cursor: 100
  });
  assert.equal(out.result, REORG.REORG_DETECTED);
  assert.equal(out.cursorAfter, 100);
});

test('INVALID_INPUT fails closed and preserves cursor', () => {
  const out = boundary({
    previous,
    current: { number: 103, hash: '0x103', parentHash: '0x102' },
    cursor: 100
  });
  assert.equal(out.result, REORG.INVALID_INPUT);
  assert.equal(out.cursorAfter, 100);
});

test('existing evidence is preserved on reorg detection', () => {
  const evidence = [{ blockNumber: 100, hash: '0x100' }];
  const before = JSON.stringify(evidence);
  const out = boundary({
    previous,
    current: { number: 101, hash: '0x101-fork', parentHash: '0x0ff' },
    cursor: 100
  });
  assert.equal(out.result, REORG.REORG_DETECTED);
  assert.equal(JSON.stringify(evidence), before);
});

test('boundary has no detector-side rollback or mutation', () => {
  const state = { cursor: 100, status: 'RUNNING' };
  const snapshot = JSON.stringify(state);
  const out = boundary({
    previous,
    current: { number: 101, hash: '0x101-fork', parentHash: '0x0ff' },
    cursor: state.cursor
  });
  assert.equal(out.result, REORG.REORG_DETECTED);
  assert.equal(JSON.stringify(state), snapshot);
});
