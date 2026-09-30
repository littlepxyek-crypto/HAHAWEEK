'use strict';

const crypto = require('node:crypto');

function assertFiniteNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('JCS_NUMBER_INVALID');
  }
}

function jcs(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (typeof value === 'number') {
    assertFiniteNumber(value);
    return Object.is(value, -0) ? '0' : JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map(jcs).join(',') + ']';
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((key) => JSON.stringify(key) + ':' + jcs(value[key])).join(',') + '}';
  }

  throw new Error('JCS_TYPE_INVALID');
}

function canonicalHash(domain, value) {
  if (typeof domain !== 'string' || domain.length === 0) {
    throw new Error('DOMAIN_INVALID');
  }
  const canonical = jcs(value);
  const preimage = Buffer.concat([
    Buffer.from(domain, 'utf8'),
    Buffer.from([0]),
    Buffer.from(canonical, 'utf8'),
  ]);
  return Object.freeze({
    canonical,
    sha256: crypto.createHash('sha256').update(preimage).digest('hex'),
  });
}

module.exports = { jcs, canonicalHash };
