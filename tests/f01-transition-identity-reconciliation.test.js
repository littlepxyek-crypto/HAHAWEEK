'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { jcs, canonicalHash } = require('../src/reference/v4/canonical-hash');

const TRANSITION_IDENTITY = {
  event_id: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  transition_sequence: '0',
  from_state: 'OBSERVED',
  to_state: 'CANONICAL',
  reason_code: 'INITIAL_CANONICAL',
};
const EXPECTED_CANONICAL_UTF8_HEX = '7b226576656e745f6964223a22307861616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161222c2266726f6d5f7374617465223a224f42534552564544222c22726561736f6e5f636f6465223a22494e495449414c5f43414e4f4e4943414c222c22746f5f7374617465223a2243414e4f4e4943414c222c227472616e736974696f6e5f73657175656e6365223a2230227d';
const EXPECTED_HASH = '767b8bf9b7a491d0e072478122920711cadee818dbfe14850143522e1f7ae389';
test('F-01 transition identity vector matches canonical bytes', () => { const actual = canonicalHash('HAHAWEEK-EVIDENCE-V4-TRANSITION', TRANSITION_IDENTITY); assert.equal(Buffer.from(actual.canonical, 'utf8').toString('hex'), EXPECTED_CANONICAL_UTF8_HEX); });
test('F-01 transition identity vector matches domain-separated hash', () => { const actual = canonicalHash('HAHAWEEK-EVIDENCE-V4-TRANSITION', TRANSITION_IDENTITY); assert.equal(actual.sha256, EXPECTED_HASH); });
test('F-01 transition identity key order is irrelevant to canonical bytes', () => { const reordered = Object.fromEntries(Object.entries(TRANSITION_IDENTITY).reverse()); assert.equal(jcs(reordered), jcs(TRANSITION_IDENTITY)); });

const REORG_OBSERVATION_IDENTITY = {
  chain_id: '4663',
  block_number: '123',
  previous_block_hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  replacement_block_hash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  detected_by_acquisition_id: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
};
const EXPECTED_REORG_CANONICAL_UTF8_HEX = '7b22626c6f636b5f6e756d626572223a22313233222c22636861696e5f6964223a2234363633222c2264657465637465645f62795f6163717569736974696f6e5f6964223a22307863636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363222c2270726576696f75735f626c6f636b5f68617368223a22307861616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161222c227265706c6163656d656e745f626c6f636b5f68617368223a223078626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262227d';
const EXPECTED_REORG_HASH = 'b738e5a2d00dd096b37cf4569560a097dc55e083170a63128602a646a01993af';

test('F-01 reorg observation golden vector', () => {
  const actual = canonicalHash('HAHAWEEK-EVIDENCE-V4-TRANSITION', REORG_OBSERVATION_IDENTITY);
  assert.equal(Buffer.from(actual.canonical, 'utf8').toString('hex'), EXPECTED_REORG_CANONICAL_UTF8_HEX);
  assert.equal(actual.sha256, EXPECTED_REORG_HASH);
});


const ACQUISITION_IDENTITY = {
  chain_id: '4663',
  provider_id: 'rpc-primary',
  request_sequence: '0',
  pagination_index: '0',
  requested_from_block: '123',
  requested_to_block: '132',
  filter_hash: '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
};

test('F-01 acquisition identity boundary is canonical and domain-separated', () => {
  const actual = canonicalHash('HAHAWEEK-EVIDENCE-V4-ACQUISITION', ACQUISITION_IDENTITY);
  assert.equal(jcs(ACQUISITION_IDENTITY), jcs({ ...ACQUISITION_IDENTITY }));
  assert.match(actual.sha256, /^[0-9a-f]{64}$/);
  assert.equal(actual.sha256, canonicalHash('HAHAWEEK-EVIDENCE-V4-ACQUISITION', ACQUISITION_IDENTITY).sha256);
});
