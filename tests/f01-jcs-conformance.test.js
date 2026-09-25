'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { jcs, canonicalHash } = require('../src/reference/v4/canonical-hash');

const DOMAIN = 'HAHAWEEK-EVIDENCE-V4-PAYLOAD';

test('F-01 JCS conformance: Unicode and escaping', () => {
  assert.equal(
    jcs({ text: 'café', quote: '"', slash: '\\', line: '\n' }),
    '{"line":"\\n","quote":"\\\"","slash":"\\\\","text":"café"}'
  );
});

test('F-01 JCS conformance: nested objects and arrays', () => {
  assert.equal(
    jcs({ z: [3, { b: true, a: null }], a: ['x', 'y'] }),
    '{"a":["x","y"],"z":[3,{"a":null,"b":true}]}'
  );
});

test('F-01 JCS conformance: numeric boundary examples', () => {
  assert.equal(jcs({ a: 1e-6, b: 1e-7, c: 1000000 }), '{"a":0.000001,"b":1e-7,"c":1000000}');
});

test('F-01 hash domain separation changes digest', () => {
  const a = canonicalHash(DOMAIN, { a: 'one' }).sha256;
  const b = canonicalHash('HAHAWEEK-EVIDENCE-V4-TRANSITION', { a: 'one' }).sha256;
  assert.notEqual(a, b);
});

test('F-01 arrays preserve protocol order', () => {
  assert.notEqual(
    canonicalHash(DOMAIN, { a: [1, 2] }).sha256,
    canonicalHash(DOMAIN, { a: [2, 1] }).sha256
  );
});
