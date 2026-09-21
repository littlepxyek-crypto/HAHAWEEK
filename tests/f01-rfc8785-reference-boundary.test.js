'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { jcs, canonicalHash } = require('../src/reference/v4/canonical-hash');

test('JCS reference boundary canonicalizes object key order', () => {
  assert.equal(jcs({ b: 'two', a: 'one' }), '{"a":"one","b":"two"}');
});

test('JCS reference boundary preserves array order', () => {
  assert.equal(jcs([3, 1, 2]), '[3,1,2]');
});

test('JCS reference boundary rejects non-finite numbers', () => {
  assert.throws(() => jcs(NaN), /JCS_NONFINITE_NUMBER/);
  assert.throws(() => jcs(Infinity), /JCS_NONFINITE_NUMBER/);
});

test('JCS reference boundary rejects unpaired surrogates', () => {
  assert.throws(() => jcs(String.fromCharCode(0xd800)), /JCS_UNPAIRED_SURROGATE/);
});

test('V4 payload golden vector remains stable', () => {
  const result = canonicalHash('HAHAWEEK-EVIDENCE-V4-PAYLOAD', { b: 'two', a: 'one' });
  assert.equal(result.canonical, '{"a":"one","b":"two"}');
  assert.equal(result.sha256, '228d7728c03cf30c3e3e4a7f4e7bdd827f54fe7cc6037a732065aa6f2356cc12');
});

test('domain separation changes digest', () => {
  const a = canonicalHash('HAHAWEEK-EVIDENCE-V4-PAYLOAD', { a: 'one' });
  const b = canonicalHash('HAHAWEEK-EVIDENCE-V4-TRANSITION', { a: 'one' });
  assert.notEqual(a.sha256, b.sha256);
});
