'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { STATES, transitionAuthorityActivation, assertProductionInactive } = require('../src/core/authority-activation-state');

const verifiedProof = {
  checkpoint_verified: true,
  cursor_verified: true,
  recovery_verified: true,
  replay_verified: true,
  negative_vectors_passed: true,
};

test('activation cannot skip verification and authorization', () => {
  assert.throws(
    () => transitionAuthorityActivation('INACTIVE', 'ACTIVE', {}),
    /AUTHORITY_ACTIVATION_TRANSITION_NOT_ALLOWED/
  );
  assert.throws(
    () => transitionAuthorityActivation('IMPLEMENTED', 'VERIFIED', {}),
    /AUTHORITY_ACTIVATION_CHECKPOINT_VERIFIED_REQUIRED/
  );
});

test('activation requires every verification gate', () => {
  const r = transitionAuthorityActivation('IMPLEMENTED', 'VERIFIED', verifiedProof);
  assert.equal(r.state, 'VERIFIED');
});

test('authorization and activation are separate', () => {
  assert.throws(
    () => transitionAuthorityActivation('VERIFIED', 'AUTHORIZED', {}),
    /EXPLICIT_AUTHORIZATION_REQUIRED/
  );
  const a = transitionAuthorityActivation('VERIFIED', 'AUTHORIZED', {
    explicit_authorization: true,
  });
  assert.equal(a.state, 'AUTHORIZED');

  assert.throws(
    () => transitionAuthorityActivation('AUTHORIZED', 'ACTIVE', { production_gate_passed: true }),
    /PRODUCTION_ENABLEMENT_REQUIRED/
  );
});

test('production activation requires explicit gate and enablement', () => {
  const a = transitionAuthorityActivation('AUTHORIZED', 'ACTIVE', {
    production_gate_passed: true,
    production_enabled: true,
  });
  assert.equal(a.state, 'ACTIVE');
});

test('active authority can be explicitly deactivated', () => {
  const r = transitionAuthorityActivation('ACTIVE', 'INACTIVE');
  assert.equal(r.state, 'INACTIVE');
});

test('non-active states are explicitly inactive', () => {
  for (const state of STATES.filter(s => s !== 'ACTIVE')) {
    assert.doesNotThrow(() => assertProductionInactive(state));
  }
});
