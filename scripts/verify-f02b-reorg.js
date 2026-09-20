#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const HEX32 = /^0x[0-9a-f]{64}$/;
const FORMAT = 'HAHAWEEK-F02B-REORG-FIXTURE-1';

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function loadFixture(file = path.join(__dirname, '..', 'tests', 'fixtures', 'reorg-f02b.json')) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function validateEvidence(evidence, label) {
  assert(Array.isArray(evidence), label + ': evidence must be an array');
  for (const item of evidence) {
    assert(item && typeof item === 'object', label + ': evidence record must be an object');
    assert(Object.keys(item).sort().join(',') === 'block_number,evidence_id,state',
      label + ': unexpected evidence keys');
    assert(HEX32.test(item.evidence_id), label + ': invalid evidence_id');
    assert(/^(0|[1-9][0-9]*)$/.test(item.block_number), label + ': invalid block_number');
    assert(item.state === 'CANONICAL', label + ': fixture evidence must start CANONICAL');
  }
}

function verifyFixture(fixture) {
  assert(fixture && typeof fixture === 'object', 'fixture must be an object');
  assert(fixture.format === FORMAT, 'unexpected fixture format');
  assert(fixture.chain_id === '4663', 'unexpected chain_id');

  const original = fixture.original;
  const replacement = fixture.replacement;
  const expected = fixture.expected;

  assert(original && replacement && expected, 'missing fixture sections');
  validateEvidence(original.evidence, 'original');
  validateEvidence(replacement.evidence, 'replacement');

  const originalById = new Map(original.evidence.map(e => [e.evidence_id, e]));
  const replacementIds = new Set(replacement.evidence.map(e => e.evidence_id));

  for (const id of expected.preserved_evidence_ids) {
    assert(originalById.has(id), 'preserved evidence missing from original: ' + id);
  }

  for (const id of expected.orphaned_evidence_ids) {
    assert(originalById.has(id), 'orphaned evidence missing from original: ' + id);
    assert(!replacementIds.has(id), 'orphaned evidence identity reused by replacement: ' + id);
  }

  for (const id of expected.canonical_replacement_ids) {
    assert(replacementIds.has(id), 'canonical replacement missing: ' + id);
    assert(!originalById.has(id), 'replacement reused historical evidence identity: ' + id);
  }

  const originalSnapshot = JSON.stringify(original.evidence);
  assert(JSON.stringify(original.evidence) === originalSnapshot,
    'historical evidence payload changed during verification');

  assert(expected.orphaned_evidence_ids.length === 2, 'unexpected orphaned evidence count');
  assert(expected.canonical_replacement_ids.length === 2, 'unexpected replacement evidence count');

  return {
    ok: true,
    preserved: expected.preserved_evidence_ids.length,
    orphaned: expected.orphaned_evidence_ids.length,
    replacements: expected.canonical_replacement_ids.length
  };
}

if (require.main === module) {
  const result = verifyFixture(loadFixture());
  process.stdout.write('F-02B OFFLINE REORG VERIFICATION: PASS\n');
  process.stdout.write(JSON.stringify(result) + '\n');
}

module.exports = { loadFixture, verifyFixture };
