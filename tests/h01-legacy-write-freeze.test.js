'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  LEGACY_ACTIVE,
  LEGACY_FROZEN,
  assertLegacyWriteAllowed,
  createLegacyWriteGuard,
} = require('../src/reference/v4/legacy-write-freeze');

test('H-01 legacy writes are allowed before freeze', () => {
  const guard = createLegacyWriteGuard();
  assert.equal(guard.getState(), LEGACY_ACTIVE);
  assert.equal(guard.assertWriteAllowed(), true);
});

test('H-01 freeze blocks legacy writes', () => {
  const guard = createLegacyWriteGuard();
  assert.equal(guard.freeze(), LEGACY_FROZEN);
  assert.throws(
    () => guard.assertWriteAllowed(),
    /LEGACY_WRITE_FROZEN/
  );
});

test('H-01 frozen state is monotonic', () => {
  const guard = createLegacyWriteGuard(LEGACY_FROZEN);
  assert.equal(guard.getState(), LEGACY_FROZEN);
  assert.throws(() => guard.assertWriteAllowed(), /LEGACY_WRITE_FROZEN/);
  assert.equal(guard.freeze(), LEGACY_FROZEN);
  assert.throws(() => guard.assertWriteAllowed(), /LEGACY_WRITE_FROZEN/);
});

test('H-01 invalid state fails closed', () => {
  assert.throws(
    () => createLegacyWriteGuard('UNKNOWN'),
    /LEGACY_WRITE_STATE_INVALID/
  );
  assert.throws(
    () => assertLegacyWriteAllowed('UNKNOWN'),
    /LEGACY_WRITE_STATE_INVALID/
  );
});

test('H-01 guard does not expose a mutable state setter', () => {
  const guard = createLegacyWriteGuard();
  assert.equal('setState' in guard, false);
  guard.freeze();
  assert.equal(guard.getState(), LEGACY_FROZEN);
});
