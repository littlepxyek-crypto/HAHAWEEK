'use strict';

const crypto = require('crypto');

const HEX_RE = /^(?:[0-9a-fA-F]{2})*$/;
const UINT_RE = /^(0|[1-9][0-9]*)$/;

function decodeSourceHex(sourceHex) {
  if (typeof sourceHex !== 'string' || !HEX_RE.test(sourceHex)) {
    throw new Error('SOURCE_BYTES_INVALID');
  }
  return Buffer.from(sourceHex, 'hex');
}

function verifyLegacySourceVector(vector) {
  if (!vector || typeof vector !== 'object') {
    throw new Error('VECTOR_REQUIRED');
  }

  if (!UINT_RE.test(vector.source_byte_length)) {
    throw new Error('SOURCE_BYTE_LENGTH_INVALID');
  }

  const bytes = decodeSourceHex(vector.source_hex);

  const actualLength = String(bytes.length);
  const actualSha256 = crypto
    .createHash('sha256')
    .update(bytes)
    .digest('hex');

  const lengthOk = actualLength === vector.source_byte_length;
  const digestOk =
    typeof vector.expected_sha256 === 'string' &&
    actualSha256 === vector.expected_sha256.toLowerCase();

  return Object.freeze({
    valid: lengthOk && digestOk,
    byteLength: actualLength,
    sha256: actualSha256,
  });
}

module.exports = {
  decodeSourceHex,
  verifyLegacySourceVector,
};
