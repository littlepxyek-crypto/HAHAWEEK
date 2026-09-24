'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { verifyAcquisition, digest } = require('../src/v4/f05-rpc-provenance-verifier');

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
