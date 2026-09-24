'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DOMAIN,
  createAuthorityBindingDigest,
  assertAuthorityBinding,
} = require('../src/core/f03-authority-binding');

const BASE = {
  segmentId: 'segment-1',
  manifestDigest: 'a'.repeat(64),
  checkpointDigest: 'b'.repeat(64),
  generation: 'generation-1',
  cursorBlock: 100,
};

test('F-03 accepts a complete cryptographically bound authority', () => {
  const bindingDigest = createAuthorityBindingDigest(BASE);
  assert.match(bindingDigest, /^[0-9a-f]{64}$/);

  assert.deepEqual(
    assertAuthorityBinding({...BASE, bindingDigest}, {...BASE}),
    {...BASE, status: 'BOUND', bindingDigest}
  );
});

test('F-03 binding digest is deterministic under key order changes', () => {
  const digestA = createAuthorityBindingDigest(BASE);
  const digestB = createAuthorityBindingDigest({
    cursorBlock: 100,
    generation: 'generation-1',
    checkpointDigest: 'b'.repeat(64),
    manifestDigest: 'a'.repeat(64),
    segmentId: 'segment-1',
  });
  assert.equal(digestA, digestB);
  assert.equal(DOMAIN, 'HAHAWEEK-EVIDENCE-V4-AUTHORITY-BINDING');
});

test('F-03 rejects missing binding digest', () => {
  assert.throws(
    () => assertAuthorityBinding({...BASE}, {...BASE}),
    /AUTHORITY_BINDING_DIGEST_INVALID/
  );
});

test('F-03 rejects manifest binding mismatch', () => {
  const bindingDigest = createAuthorityBindingDigest(BASE);
  assert.throws(
    () => assertAuthorityBinding(
      {...BASE, manifestDigest: 'c'.repeat(64), bindingDigest},
      {...BASE}
    ),
    /AUTHORITY_MANIFESTDIGEST_BINDING_CONFLICT/
  );
});

test('F-03 rejects checkpoint binding mismatch', () => {
  const bindingDigest = createAuthorityBindingDigest(BASE);
  assert.throws(
    () => assertAuthorityBinding(
      {...BASE, checkpointDigest: 'c'.repeat(64), bindingDigest},
      {...BASE}
    ),
    /AUTHORITY_CHECKPOINTDIGEST_BINDING_CONFLICT/
  );
});

test('F-03 rejects segment binding mismatch', () => {
  const bindingDigest = createAuthorityBindingDigest(BASE);
  assert.throws(
    () => assertAuthorityBinding(
      {...BASE, segmentId: 'segment-2', bindingDigest},
      {...BASE}
    ),
    /AUTHORITY_SEGMENTID_BINDING_CONFLICT/
  );
});

test('F-03 rejects generation mismatch', () => {
  const bindingDigest = createAuthorityBindingDigest(BASE);
  assert.throws(
    () => assertAuthorityBinding(
      {...BASE, generation: 'generation-2', bindingDigest},
      {...BASE}
    ),
    /AUTHORITY_GENERATION_BINDING_CONFLICT/
  );
});

test('F-03 rejects cursor regression', () => {
  const authority = {...BASE, cursorBlock: 99};
  const bindingDigest = createAuthorityBindingDigest(authority);
  assert.throws(
    () => assertAuthorityBinding(
      {...authority, bindingDigest},
      BASE
    ),
    /AUTHORITY_CURSORBLOCK_BINDING_CONFLICT/
  );
});

test('F-03 rejects a stale/tampered binding digest', () => {
  assert.throws(
    () => assertAuthorityBinding({...BASE, bindingDigest: 'c'.repeat(64)}, {...BASE}),
    /AUTHORITY_BINDING_CONFLICT/
  );
});

test('F-03 replay of identical authority binding is deterministic', () => {
  const bindingDigest = createAuthorityBindingDigest(BASE);
  const authority = {...BASE, bindingDigest};
  assert.deepEqual(assertAuthorityBinding(authority, BASE), assertAuthorityBinding(authority, BASE));
});
