'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { verifyScenario } = require('../src/v4/f04-migration-verifier');

const fixturePath = path.join(__dirname, '..', 'docs', 'golden-vectors', 'f04-migration-scenario.json');

function load() { return JSON.parse(fs.readFileSync(fixturePath, 'utf8')); }

test('F-04: complete migration scenario verifies deterministically', () => {
  const input = load();
  const before = JSON.stringify(input);
  const a = verifyScenario(input);
  const b = verifyScenario(input);
  assert.equal(a.status, 'VERIFIED');
  assert.equal(a.verification_digest, b.verification_digest);
  assert.equal(JSON.stringify(input), before);
});

for (const [name, mutate, code] of [
  ['source digest mismatch', x => { x.sources[0].bytes = 'tampered'; }, 'SOURCE_DIGEST_MISMATCH'],
  ['missing disposition', x => { x.dispositions = []; }, 'MISSING_DISPOSITION'],
  ['broken provenance', x => { x.dispositions[0].provenance.source_unit_id = 'unknown'; }, 'BROKEN_PROVENANCE'],
  ['result digest mismatch', x => { x.results[0].bytes = 'tampered'; }, 'RESULT_DIGEST_MISMATCH'],
  ['manifest accounting mismatch', x => { x.manifest.unit_count = 2; }, 'ACCOUNTING_MISMATCH'],
  ['verification digest mismatch', x => { x.manifest.verification_digest = '00'.repeat(32); }, 'NON_DETERMINISTIC_REPLAY']
]) {
  test('F-04: fail closed — ' + name, () => {
    const input = load();
    mutate(input);
    assert.throws(() => verifyScenario(input), err => err.code === code);
  });
}
