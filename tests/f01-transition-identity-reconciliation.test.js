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

const EXPECTED_CANONICAL_UTF8_HEX =
  '7b226576656e745f6964223a22307861616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161222c2266726f6d5f7374617465223a224f42534552564544222c22726561736f6e5f636f6465223a22494e495449414c5f43414e4f4e4943414c222c22746f5f7374617465223a2243414e4f4e4943414c222c227472616e736974696f6e5f73657175656e6365223a2230227d';

const EXPECTED_HASH = '767b8bf9b7a491d0e072478122920711cadee818dbfe14850143522e1f7ae389';

test('F-01 transition identity vector matches canonical bytes', () => {
  const actual = canonicalHash('HAHAWEEK-EVIDENCE-V4-TRANSITION', TRANSITION_IDENTITY);
  assert.equal(Buffer.from(actual.canonical, 'utf8').toString('hex'), EXPECTED_CANONICAL_UTF8_HEX);
});

test('F-01 transition identity vector matches domain-separated hash', () => {
  const actual = canonicalHash('HAHAWEEK-EVIDENCE-V4-TRANSITION', TRANSITION_IDENTITY);
  assert.equal(actual.sha256, EXPECTED_HASH);
});

test('F-01 transition identity key order is irrelevant to canonical bytes', () => {
  const reordered = Object.fromEntries(Object.entries(TRANSITION_IDENTITY).reverse());
  assert.equal(jcs(reordered), jcs(TRANSITION_IDENTITY));
});
