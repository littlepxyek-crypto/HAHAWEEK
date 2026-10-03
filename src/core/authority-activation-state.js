'use strict';

const STATES = Object.freeze([
  'INACTIVE',
  'IMPLEMENTED',
  'VERIFIED',
  'AUTHORIZED',
  'ACTIVE',
]);

const REQUIRED_VERIFICATION = Object.freeze([
  'checkpoint_verified',
  'cursor_verified',
  'recovery_verified',
  'replay_verified',
  'negative_vectors_passed',
]);

function assertState(state) {
  if (!STATES.includes(state)) throw new Error('AUTHORITY_ACTIVATION_STATE_INVALID');
}

function assertProof(proof) {
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
    throw new Error('AUTHORITY_ACTIVATION_PROOF_REQUIRED');
  }
}

function transitionAuthorityActivation(current, next, proof = {}) {
  assertState(current);
  assertState(next);
  assertProof(proof);

  if (current === next) return Object.freeze({ state: current, transition: 'NOOP' });

  if (current === 'ACTIVE' && next === 'INACTIVE') {
    return Object.freeze({ state: 'INACTIVE', transition: 'DEACTIVATE' });
  }

  const expected = {
    INACTIVE: 'IMPLEMENTED',
    IMPLEMENTED: 'VERIFIED',
    VERIFIED: 'AUTHORIZED',
    AUTHORIZED: 'ACTIVE',
  };

  if (expected[current] !== next) {
    throw new Error('AUTHORITY_ACTIVATION_TRANSITION_NOT_ALLOWED');
  }

  if (next === 'VERIFIED') {
    for (const key of REQUIRED_VERIFICATION) {
      if (proof[key] !== true) throw new Error('AUTHORITY_ACTIVATION_' + key.toUpperCase() + '_REQUIRED');
    }
  }

  if (next === 'AUTHORIZED' && proof.explicit_authorization !== true) {
    throw new Error('AUTHORITY_ACTIVATION_EXPLICIT_AUTHORIZATION_REQUIRED');
  }

  if (next === 'ACTIVE') {
    if (proof.production_gate_passed !== true) {
      throw new Error('AUTHORITY_ACTIVATION_PRODUCTION_GATE_REQUIRED');
    }
    if (proof.production_enabled !== true) {
      throw new Error('AUTHORITY_ACTIVATION_PRODUCTION_ENABLEMENT_REQUIRED');
    }
  }

  return Object.freeze({
    state: next,
    transition: current + '->' + next,
    required_verification: next === 'VERIFIED' ? REQUIRED_VERIFICATION : [],
  });
}

function assertProductionInactive(state) {
  assertState(state);
  if (state === 'ACTIVE') throw new Error('PRODUCTION_AUTHORITY_ACTIVE');
  return true;
}

module.exports = {
  STATES,
  REQUIRED_VERIFICATION,
  transitionAuthorityActivation,
  assertProductionInactive,
};
