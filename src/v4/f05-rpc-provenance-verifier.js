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

function digestWithoutField(value, field) {
  const copy = { ...value };
  delete copy[field];
  return digest(copy);
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function acquisitionIdentity(input) { return { provider: input.provider.id, endpoint: input.provider.endpoint, chain: input.chain.id, request: input.request.id, method: input.request.method, page: input.request.page, context: input.context }; }

function verifyAcquisition(input) {
  if (!input || input.format !== 'HAHAWEEK-F05-RPC-PROVENANCE-1') fail('MALFORMED_PROVENANCE', 'invalid format');
  if (!input.provider || !input.chain || !input.request || !input.response || !input.normalized || !input.manifest) fail('INCOMPLETE_PROVENANCE', 'required provenance sections missing');
  if (!input.provider.id || !input.provider.endpoint || !input.chain.id || !input.request.id || !input.request.method || input.request.page == null || !input.context || !input.context.acquired_at) fail('INCOMPLETE_PROVENANCE', 'identity/context incomplete');

  const responseDigest = digestWithoutField(input.response, 'digest');
  if (responseDigest !== input.response.digest) fail('RESPONSE_DIGEST_MISMATCH', 'response digest mismatch');

  if (input.normalized.source_response_digest !== responseDigest) fail('NORMALIZATION_SOURCE_MISMATCH', 'normalized source mismatch');
  const normalizedDigest = digestWithoutField(input.normalized, 'digest');
  if (normalizedDigest !== input.normalized.digest) fail('NORMALIZED_DIGEST_MISMATCH', 'normalized digest mismatch');

  if (input.block_check) {
    if (input.block_check.chain_id !== input.chain.id) fail('CHAIN_MISMATCH', 'block chain mismatch');
    if (input.block_check.response_digest !== responseDigest) fail('CROSSCHECK_MISMATCH', 'block response mismatch');
  }
  if (input.receipt_check) {
    if (input.receipt_check.chain_id !== input.chain.id) fail('CHAIN_MISMATCH', 'receipt chain mismatch');
    if (input.receipt_check.response_digest !== responseDigest) fail('CROSSCHECK_MISMATCH', 'receipt response mismatch');
  }

  if (input.failure) fail('PROVIDER_FAILURE', 'failed acquisition cannot become valid evidence');

  const identity = acquisitionIdentity(input);
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

function verifyAcquisitionSet(inputs) {
  const seen = new Map();
  for (const input of inputs) {
    const result = verifyAcquisition(input);
    const key = digest(acquisitionIdentity(input));
    const prior = seen.get(key);
    if (prior && prior !== result.acquisition_digest) fail('INTEGRITY_CONFLICT', 'same acquisition identity has different digest');
    seen.set(key, result.acquisition_digest);
  }
  return { status: 'VERIFIED', count: seen.size };
}

module.exports = { verifyAcquisition, verifyAcquisitionSet, acquisitionIdentity, canonical, digest };
