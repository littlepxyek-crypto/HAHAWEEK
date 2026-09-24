'use strict';

const crypto = require('node:crypto');
const { assertProductionAuthority } = require('./f03-production-authority-record');

const DOMAIN = 'HAHAWEEK-EVIDENCE-V4-AUTHORITY-BINDING';
const HASH_PATTERN = /^[0-9a-f]{64}$/;

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('AUTHORITY_BINDING_NUMBER_INVALID');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((key) => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
  }
  throw new TypeError('AUTHORITY_BINDING_VALUE_INVALID');
}

function commitmentOf(authority) {
  return {
    segmentId: authority.segmentId,
    manifestDigest: authority.manifestDigest,
    checkpointDigest: authority.checkpointDigest,
    generation: authority.generation,
    cursorBlock: authority.cursorBlock,
  };
}

function createAuthorityBindingDigest(authority) {
  assertProductionAuthority(authority);
  const canonical = Buffer.from(canonicalize(commitmentOf(authority)), 'utf8');
  return crypto.createHash('sha256')
    .update(Buffer.from(DOMAIN + '\0', 'utf8'))
    .update(canonical)
    .digest('hex');
}

function assertAuthorityBinding(authority, expected) {
  assertProductionAuthority(authority);
  assertProductionAuthority(expected);

  if (typeof authority.bindingDigest !== 'string' || !HASH_PATTERN.test(authority.bindingDigest)) {
    throw new Error('AUTHORITY_BINDING_DIGEST_INVALID');
  }

  const actualCommitment = commitmentOf(authority);
  const expectedCommitment = commitmentOf(expected);

  for (const key of Object.keys(expectedCommitment)) {
    if (actualCommitment[key] !== expectedCommitment[key]) {
      throw new Error('AUTHORITY_' + key.toUpperCase() + '_BINDING_CONFLICT');
    }
  }

  const expectedDigest = createAuthorityBindingDigest(expected);
  const actualDigest = createAuthorityBindingDigest(authority);

  if (authority.bindingDigest !== expectedDigest || authority.bindingDigest !== actualDigest) {
    throw new Error('AUTHORITY_BINDING_CONFLICT');
  }

  return {
    status: 'BOUND',
    ...actualCommitment,
    bindingDigest: authority.bindingDigest,
  };
}

module.exports = {
  DOMAIN,
  createAuthorityBindingDigest,
  assertAuthorityBinding,
};
