'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { assertAuthorityChain, assertAuthorityBinding } = require('../src/core/f03-authority-chain');

test('F-03 accepts complete authority chain', () => {
  assert.deepEqual(assertAuthorityChain({
    segmentsCommitted: true, manifestCommitted: true, checkpointCommitted: true, cursorAdvanceRequested: true,
  }), {
    status: 'AUTHORIZED', segmentsCommitted: true, manifestCommitted: true, checkpointCommitted: true,
  });
});

test('F-03 rejects incomplete authority chain', () => {
  assert.throws(() => assertAuthorityChain({
    segmentsCommitted: true, manifestCommitted: true, checkpointCommitted: false, cursorAdvanceRequested: true,
  }), /CHECKPOINT_NOT_COMMITTED/);
});

test('F-03 requires manifest/checkpoint bindings', () => {
  assert.throws(() => assertAuthorityBinding({
    manifestMatchesSegments: false, checkpointMatchesManifest: true,
  }), /MANIFEST_SEGMENT_MISMATCH/);
  assert.throws(() => assertAuthorityBinding({
    manifestMatchesSegments: true, checkpointMatchesManifest: false,
  }), /CHECKPOINT_MANIFEST_MISMATCH/);
  assert.deepEqual(assertAuthorityBinding({
    manifestMatchesSegments: true, checkpointMatchesManifest: true,
  }), { status: 'BOUND' });
});
