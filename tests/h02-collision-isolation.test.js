'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  digest,
  classifyReplay,
  assertNoCollision,
} = require('../src/reference/v4/collision-isolation');

const IDENTITY = 'evidence-identity-001';

test('H-02 identical identity and digest is idempotent', () => {
  const evidenceDigest = digest('same-evidence');
  const result = classifyReplay({
    identity: IDENTITY,
    digest: evidenceDigest,
    existing: { identity: IDENTITY, digest: evidenceDigest },
  });

  assert.equal(result.classification, 'IDEMPOTENT_REPLAY');
  assert.doesNotThrow(() => assertNoCollision(result));
});

test('H-02 same identity with different digest is a collision', () => {
  const result = classifyReplay({
    identity: IDENTITY,
    digest: digest('new-evidence'),
    existing: {
      identity: IDENTITY,
      digest: digest('original-evidence'),
    },
  });

  assert.equal(result.classification, 'IDENTITY_COLLISION');
  assert.equal(result.code, 'EVIDENCE_IDENTITY_CONFLICT');
  assert.throws(
    () => assertNoCollision(result),
    /EVIDENCE_IDENTITY_CONFLICT/
  );
});

test('H-02 new identity is not treated as collision', () => {
  const result = classifyReplay({
    identity: 'evidence-identity-002',
    digest: digest('evidence'),
    existing: null,
  });

  assert.equal(result.classification, 'NEW');
  assert.doesNotThrow(() => assertNoCollision(result));
});

test('H-02 different existing identity remains distinct', () => {
  const result = classifyReplay({
    identity: 'evidence-identity-002',
    digest: digest('evidence'),
    existing: {
      identity: IDENTITY,
      digest: digest('other-evidence'),
    },
  });

  assert.equal(result.classification, 'DIFFERENT_IDENTITY');
  assert.doesNotThrow(() => assertNoCollision(result));
});
