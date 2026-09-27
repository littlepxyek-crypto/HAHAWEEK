'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createRawEventRecord } = require('../src/index');

test('runtime raw projection preserves canonical identity fields', () => {
  const log = {
    blockNumber: 64986697,
    blockHash: '0x' + 'a'.repeat(64),
    transactionHash: '0x' + 'b'.repeat(64),
    transactionIndex: 3,
    index: 7,
    address: '0x' + 'c'.repeat(40),
    topics: ['0x' + 'd'.repeat(64)],
    data: '0xdeadbeef',
  };

  const record = createRawEventRecord(log, 4663, '4663:64986697:tx:7');

  assert.equal(record.block_hash, log.blockHash);
  assert.equal(record.transaction_index, log.transactionIndex);
  assert.equal(record.transaction_hash, log.transactionHash);
  assert.equal(record.log_index, log.index);
  assert.equal(record.chain_id, 4663);
});

test('runtime raw projection preserves explicit null identity fields', () => {
  const log = {
    blockNumber: 10,
    transactionHash: '0x' + 'b'.repeat(64),
    index: 1,
    address: '0x' + 'c'.repeat(40),
    topics: [],
    data: '0x',
  };

  const record = createRawEventRecord(log, 4663, 'id');

  assert.equal(record.block_hash, null);
  assert.equal(record.transaction_index, null);
});
