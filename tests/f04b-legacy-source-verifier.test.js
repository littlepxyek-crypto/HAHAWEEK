'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  decodeSourceHex,
  verifyLegacySourceVector,
} = require('../src/reference/v4/legacy-migration');

const vectors = require('../docs/golden-vectors/f04a-legacy-source.json');

test('F-04B legacy source golden vectors verify deterministically', () => {
  for (const vector of vectors.vectors) {
    const result = verifyLegacySourceVector(vector);

    assert.equal(result.valid, true, vector.id);
    assert.equal(result.byteLength, vector.source_byte_length, vector.id);
    assert.equal(result.sha256, vector.expected_sha256, vector.id);
  }
});

test('F-04B invalid source bytes fail closed', () => {
  assert.throws(
    () => decodeSourceHex('not-hex'),
    /SOURCE_BYTES_INVALID/
  );

  assert.throws(
    () => decodeSourceHex('abc'),
    /SOURCE_BYTES_INVALID/
  );
});

test('F-04B tampered source fails verification', () => {
  const vector = {
    ...vectors.vectors.find((item) => item.id === 'source-ascii'),
    source_hex: '6861686177656566',
  };

  const result = verifyLegacySourceVector(vector);

  assert.equal(result.valid, false);
});

test('F-04B byte accounting is exact, not inferred from records', () => {
  const vector = vectors.vectors.find((item) => item.id === 'source-ascii');

  const tampered = {
    ...vector,
    source_byte_length: '9',
  };

  const result = verifyLegacySourceVector(tampered);

  assert.equal(result.valid, false);
  assert.equal(result.byteLength, '8');
});

test('F-04B verifier does not mutate its input', () => {
  const vector = vectors.vectors.find((item) => item.id === 'source-ascii');
  const before = JSON.stringify(vector);

  verifyLegacySourceVector(vector);

  assert.equal(JSON.stringify(vector), before);
});
