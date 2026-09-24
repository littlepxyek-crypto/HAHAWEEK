'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertRecoveryAuthority,
} = require('../src/core/f03-generation-recovery');

function authority(overrides = {}) {
  return {
    segmentId: 'seg-101-101',
    manifestDigest: 'manifest-1',
    checkpointDigest: 'checkpoint-1',
    generation: 'g1',
    cursorBlock: 101,
    ...overrides,
  };
}

test('F-03 recovery accepts the same persisted authority after restart', () => {
  const persisted = authority();
  const recovered = authority();

  assert.deepEqual(
    assertRecoveryAuthority(persisted, recovered),
    {
      status: 'RECOVERED',
      generation: 'g1',
      cursorBlock: 101,
    }
  );
});

test('F-03 recovery rejects authority replacement with a conflicting generation', () => {
  assert.throws(
    () => assertRecoveryAuthority(
      authority(),
      authority({ generation: 'g2' })
    ),
    /AUTHORITY_GENERATION_CONFLICT/
  );
});

test('F-03 recovery rejects cursor regression after restart', () => {
  assert.throws(
    () => assertRecoveryAuthority(
      authority(),
      authority({ cursorBlock: 100 })
    ),
    /AUTHORITY_REGRESSION/
  );
});

test('F-03 recovery rejects changed manifest or checkpoint identity', () => {
  assert.throws(
    () => assertRecoveryAuthority(
      authority(),
      authority({ manifestDigest: 'manifest-2' })
    ),
    /AUTHORITY_BINDING_CONFLICT/
  );

  assert.throws(
    () => assertRecoveryAuthority(
      authority(),
      authority({ checkpointDigest: 'checkpoint-2' })
    ),
    /AUTHORITY_BINDING_CONFLICT/
  );
});
