'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { verifyAcquisition, verifyAcquisitionSet, digest } = require('../src/v4/f05-rpc-provenance-verifier');

const p = path.join(__dirname, '..', 'docs', 'golden-vectors', 'f05-rpc-provenance-scenario.json');
function load() { return JSON.parse(fs.readFileSync(p, 'utf8')); }

test('F-05 verifier is deterministic and non-mutating', () => {
  const x = load();
  const before = JSON.stringify(x);
  const a = verifyAcquisition(x);
  const b = verifyAcquisition(x);
  assert.equal(a.status, 'VERIFIED');
  assert.equal(a.acquisition_digest, b.acquisition_digest);
  assert.equal(JSON.stringify(x), before);
});

for (const [name, mutate, code] of [
  ['missing provider', x => { delete x.provider; }, 'INCOMPLETE_PROVENANCE'],
  ['response mismatch', x => { x.response.items = ['tampered']; }, 'RESPONSE_DIGEST_MISMATCH'],
  ['normalization mismatch', x => { x.normalized.source_response_digest = '00'.repeat(32); }, 'NORMALIZATION_SOURCE_MISMATCH'],
  ['chain mismatch', x => { x.block_check.chain_id = '9999'; }, 'CHAIN_MISMATCH'],
  ['cross-check mismatch', x => { x.block_check.response_digest = '00'.repeat(32); }, 'CROSSCHECK_MISMATCH'],
  ['manifest mismatch', x => { x.manifest.acquisition_digest = '00'.repeat(32); }, 'ACQUISITION_DIGEST_MISMATCH']
]) {
  test('F-05 fail closed — ' + name, () => {
    const x = load();
    mutate(x);
    assert.throws(() => verifyAcquisition(x), err => err.code === code);
  });
}


test('F-05 verifies explicit endpoint, acquisition context, and receipt linkage', () => {
  const x = load();
  const r = verifyAcquisition(x);
  assert.equal(r.status, 'VERIFIED');
  assert.equal(x.provider.endpoint, 'https://provider-a.example/rpc');
  assert.equal(x.context.acquired_at, '2026-09-24T00:00:00Z');
  assert.equal(x.receipt_check.response_digest, x.response.digest);
});

test('F-05 repeated identical acquisition is replay-safe', () => {
  const x = load();
  const a = verifyAcquisitionSet([x, structuredClone(x)]);
  assert.deepEqual(a, { status: 'VERIFIED', count: 1 });
});

test('F-05 same identity with different digest fails as integrity conflict', () => {
  const a = load();
  const b = structuredClone(a);
  b.response.items = ['different'];
  b.response.digest = digest({ items: b.response.items });
  b.normalized.payload = ['different'];
  b.normalized.source_response_digest = b.response.digest;
  b.normalized.digest = digest({ payload: b.normalized.payload, source_response_digest: b.normalized.source_response_digest });
  b.manifest.response_digest = b.response.digest;
  b.manifest.normalized_digest = b.normalized.digest;
  b.manifest.acquisition_digest = digest({
    identity: { provider: b.provider.id, endpoint: b.provider.endpoint, chain: b.chain.id, request: b.request.id, method: b.request.method, page: b.request.page, context: b.context },
    response_digest: b.response.digest,
    normalized_digest: b.normalized.digest
  });
  assert.throws(() => verifyAcquisitionSet([a, b]), err => err.code === 'INTEGRITY_CONFLICT');
});

test('F-05 provider/network failure cannot become valid evidence', () => {
  const x = load();
  x.failure = { code: 'TIMEOUT', observable: true };
  assert.throws(() => verifyAcquisition(x), err => err.code === 'PROVIDER_FAILURE');
});
