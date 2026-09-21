'use strict';

const crypto = require('node:crypto');

function assertValidString(value) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (next < 0xdc00 || next > 0xdfff) throw new TypeError('JCS_UNPAIRED_SURROGATE');
      i++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError('JCS_UNPAIRED_SURROGATE');
    }
  }
}

function jcs(value) {
  if (typeof value === 'string') { assertValidString(value); return JSON.stringify(value); }
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('JCS_NONFINITE_NUMBER');
    if (Object.is(value, -0)) return '0';
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(jcs).join(',') + ']';
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => {
      assertValidString(k);
      return JSON.stringify(k) + ':' + jcs(value[k]);
    }).join(',') + '}';
  }
  throw new TypeError('JCS_UNSUPPORTED_TYPE');
}

function canonicalHash(domain, object) {
  if (typeof domain !== 'string' || domain.length === 0) throw new TypeError('INVALID_DOMAIN');
  const canonical = jcs(object);
  const preimage = Buffer.concat([
    Buffer.from(domain, 'utf8'),
    Buffer.from([0]),
    Buffer.from(canonical, 'utf8'),
  ]);
  return {
    canonical,
    sha256: crypto.createHash('sha256').update(preimage).digest('hex'),
  };
}

module.exports = { jcs, canonicalHash };
