'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { loadFixture, verifyFixture } = require('../scripts/verify-f02b-reorg');

test('F-02B fixture verifies historical preservation and replacement identities', () => {
  const fixture = loadFixture();
  const result = verifyFixture(fixture);

  assert.equal(result.ok, true);
  assert.equal(result.preserved, 3);
  assert.equal(result.orphaned, 2);
  assert.equal(result.replacements, 2);
});

test('F-02B rejects replacement reuse of historical evidence identity', () => {
  const fixture = loadFixture();
  fixture.replacement.evidence[0].evidence_id =
    fixture.original.evidence[1].evidence_id;

  assert.throws(
    () => verifyFixture(fixture),
    /replacement reused historical evidence identity|orphaned evidence identity reused by replacement/
  );
});

test('F-02B rejects loss of historical evidence', () => {
  const fixture = loadFixture();
  fixture.expected.preserved_evidence_ids =
    fixture.expected.preserved_evidence_ids.slice(0, 2);

  assert.throws(
    () => verifyFixture(fixture),
    /preserved evidence/
  );
});
