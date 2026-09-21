'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { jcs, canonicalHash } = require('../src/reference/v4/canonical-hash');

const DOMAIN = 'HAHAWEEK-EVIDENCE-V4-PAYLOAD';

test('F-01 basic vector matches RFC8785-compatible canonical bytes and hash', () => {
  const a = { b: 'two', a: 'one' };
  const b = { a: 'one', b: 'two' };

  const expected = '{"a":"one","b":"two"}';
  const digest = '228d7728c03cf30c3e3e4a7f4e7bdd827f54fe7cc6037a732065aa6f2356cc12';

  assert.equal(jcs(a), expected);
  assert.deepEqual(canonicalHash(DOMAIN, a), { canonical: expected, sha256: digest });
  assert.equal(canonicalHash(DOMAIN, a).sha256, canonicalHash(DOMAIN, b).sha256);
});

test('F-01 value mutation changes identity', () => {
  const base = canonicalHash(DOMAIN, { a: 'one', b: 'two' }).sha256;
  const changed = canonicalHash(DOMAIN, { a: 'ONE', b: 'two' }).sha256;
  assert.notEqual(base, changed);
});

test('F-01 rejects non-finite numbers', () => {
  assert.throws(() => jcs({ n: NaN }), /JCS_NUMBER_INVALID/);
  assert.throws(() => jcs({ n: Infinity }), /JCS_NUMBER_INVALID/);
});

test('F-01 canonicalizes negative zero as zero', () => {
  assert.equal(jcs({ n: -0 }), '{"n":0}');
});
