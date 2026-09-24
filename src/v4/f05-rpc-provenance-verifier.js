'use strict';

const crypto = require('node:crypto');

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}

function digest(value) {
  return crypto.createHash('sha256').update(Buffer.from(canonical(value), 'utf8')).digest('hex');
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function verifyAcquisition(input) {
  if (!input || input.format !== 'HAHAWEEK-F05-RPC-PROVENANCE-1') fail('MALFORMED_PROVENANCE', 'invalid format');
  if (!input.provider || !input.chain || !input.request || !input.response || !input.normalized || !input.manifest) {
    fail('INCOMPLETE_PROVENANCE', 'required provenance sections missing');
  }
  if (!input.provider.id || !input.chain.id || !input.request.id || !input.request.method) fail('INCOMPLETE_PROVENANCE', 'identity incomplete');
  const responseDigest = digest(input.response);
  if (responseDigest !== input.response.digest) fail('RESPONSE_DIGEST_MISMATCH', 'response digest mismatch');
  if (input.normalized.source_response_digest !== responseDigest) fail('NORMALIZATION_SOURCE_MISMATCH', 'normalized source mismatch');
  const normalizedDigest = digest(input.normalized.payload);
  if (normalizedDigest !== input.normalized.digest) fail('NORMALIZED_DIGEST_MISMATCH', 'normalized digest mismatch');

  if (input.block_check) {
    if (input.block_check.chain_id !== input.chain.id) fail('CHAIN_MISMATCH', 'block chain mismatch');
    if (input.block_check.response_digest !== responseDigest) fail('CROSSCHECK_MISMATCH', 'block response mismatch');
  }
  if (input.receipt_check) {
    if (input.receipt_check.chain_id !== input.chain.id) fail('CHAIN_MISMATCH', 'receipt chain mismatch');
    if (input.receipt_check.response_digest !== responseDigest) fail('CROSSCHECK_MISMATCH', 'receipt response mismatch');
  }

  const identity = {
    provider: input.provider.id,
    chain: input.chain.id,
    request: input.request.id,
    method: input.request.method,
    page: input.request.page ?? null
  };
  const acquisitionDigest = digest({
    identity,
    response_digest: responseDigest,
    normalized_digest: normalizedDigest
  });
  if (input.manifest.acquisition_digest !== acquisitionDigest) fail('ACQUISITION_DIGEST_MISMATCH', 'manifest digest mismatch');
  if (input.manifest.response_digest !== responseDigest) fail('ACQUISITION_DIGEST_MISMATCH', 'response linkage mismatch');
  if (input.manifest.normalized_digest !== normalizedDigest) fail('ACQUISITION_DIGEST_MISMATCH', 'normalized linkage mismatch');

  return { status: 'VERIFIED', acquisition_digest: acquisitionDigest, response_digest: responseDigest, normalized_digest: normalizedDigest };
}

module.exports = { verifyAcquisition, canonical, digest };
