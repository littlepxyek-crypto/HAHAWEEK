'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { jcs, canonicalHash } = require('../src/reference/v4/canonical-hash');

const EVENT_IDENTITY = {
  chain_id: '4663',
  block_hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  block_number: '123',
  transaction_hash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  transaction_index: '4',
  log_index: '7',
  contract_address: '0xcccccccccccccccccccccccccccccccccccccccc',
  topic0: '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
};

const EXPECTED_CANONICAL_UTF8_HEX =
  '7b22626c6f636b5f68617368223a22307861616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161222c22626c6f636b5f6e756d626572223a22313233222c22636861696e5f6964223a2234363633222c22636f6e74726163745f61646472657373223a22307863636363636363636363636363636363636363636363636363636363636363636363636363636363222c226c6f675f696e646578223a2237222c22746f70696330223a22307864646464646464646464646464646464646464646464646464646464646464646464646464646464646464646464646464646464646464646464646464646464222c227472616e73616374696f6e5f68617368223a22307862626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262222c227472616e73616374696f6e5f696e646578223a2234227d';
const EXPECTED_HASH = '8de0ef8960c3d4fe1e21b6409e78c9f54111bfa9a1c2d10c3b242451191e7674';

test('F-01 event identity vector matches canonical bytes', () => {
  const actual = canonicalHash('HAHAWEEK-EVIDENCE-V4-PAYLOAD', EVENT_IDENTITY);
  assert.equal(Buffer.from(actual.canonical, 'utf8').toString('hex'), EXPECTED_CANONICAL_UTF8_HEX);
});

test('F-01 event identity vector matches domain-separated hash', () => {
  const actual = canonicalHash('HAHAWEEK-EVIDENCE-V4-PAYLOAD', EVENT_IDENTITY);
  assert.equal(actual.sha256, EXPECTED_HASH);
});

test('F-01 event identity key order is irrelevant to canonical bytes', () => {
  const reordered = Object.fromEntries(Object.entries(EVENT_IDENTITY).reverse());
  assert.equal(jcs(reordered), jcs(EVENT_IDENTITY));
});
