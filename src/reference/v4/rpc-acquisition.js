'use strict';

const crypto = require('node:crypto');

const ALLOWED_COMPLETENESS = new Set([
  'COMPLETE',
  'PARTIAL',
  'FAILED',
  'UNKNOWN',
]);

function assertDecimalString(value, field) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${field}_INVALID`);
  }
}

function assertSha256(value, field) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${field}_INVALID`);
  }
}

function assertIsoTimestamp(value) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error('OBSERVED_AT_INVALID');
  }
}

function canonicalInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('ACQUISITION_REQUIRED');
  }

  const required = [
    'protocol',
    'version',
    'chain_id',
    'rpc_source',
    'method',
    'request_digest',
    'response_digest',
    'from_block',
    'to_block',
    'observed_at',
    'completeness',
  ];

  const keys = Object.keys(input).sort();
  const expected = [...required].sort();
  if (keys.length !== expected.length || keys.some((key, i) => key !== expected[i])) {
    throw new Error('ACQUISITION_KEYS_INVALID');
  }

  if (typeof input.protocol !== 'string' || input.protocol.length === 0) {
    throw new Error('PROTOCOL_INVALID');
  }
  if (typeof input.version !== 'string' || input.version.length === 0) {
    throw new Error('VERSION_INVALID');
  }
  assertDecimalString(input.chain_id, 'CHAIN_ID');
  if (typeof input.rpc_source !== 'string' || input.rpc_source.length === 0) {
    throw new Error('RPC_SOURCE_INVALID');
  }
  if (typeof input.method !== 'string' || input.method.length === 0) {
    throw new Error('METHOD_INVALID');
  }
  assertSha256(input.request_digest, 'REQUEST_DIGEST');
  assertSha256(input.response_digest, 'RESPONSE_DIGEST');
  assertDecimalString(input.from_block, 'FROM_BLOCK');
  assertDecimalString(input.to_block, 'TO_BLOCK');
  if (BigInt(input.to_block) < BigInt(input.from_block)) {
    throw new Error('BLOCK_RANGE_INVALID');
  }
  assertIsoTimestamp(input.observed_at);

  if (!ALLOWED_COMPLETENESS.has(input.completeness)) {
    throw new Error('COMPLETENESS_INVALID');
  }

  return JSON.stringify({
    protocol: input.protocol,
    version: input.version,
    chain_id: input.chain_id,
    rpc_source: input.rpc_source,
    method: input.method,
    request_digest: input.request_digest,
    response_digest: input.response_digest,
    from_block: input.from_block,
    to_block: input.to_block,
    observed_at: input.observed_at,
    completeness: input.completeness,
  });
}

function acquisitionIdentity(input) {
  const canonical = canonicalInput(input);
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function verifyAcquisition(input) {
  const canonical = canonicalInput(input);
  return Object.freeze({
    valid: true,
    canonical,
    acquisition_identity: crypto.createHash('sha256').update(canonical, 'utf8').digest('hex'),
  });
}

module.exports = {
  ALLOWED_COMPLETENESS,
  canonicalInput,
  acquisitionIdentity,
  verifyAcquisition,
};
