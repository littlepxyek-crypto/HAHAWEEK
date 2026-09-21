'use strict';

const LEGACY_ACTIVE = 'LEGACY_ACTIVE';
const LEGACY_FROZEN = 'LEGACY_FROZEN';

function assertLegacyWriteAllowed(state) {
  if (state !== LEGACY_ACTIVE) {
    if (state === LEGACY_FROZEN) {
      throw new Error('LEGACY_WRITE_FROZEN');
    }
    throw new Error('LEGACY_WRITE_STATE_INVALID');
  }
  return true;
}

function createLegacyWriteGuard(initialState = LEGACY_ACTIVE) {
  if (![LEGACY_ACTIVE, LEGACY_FROZEN].includes(initialState)) {
    throw new Error('LEGACY_WRITE_STATE_INVALID');
  }

  let state = initialState;

  return Object.freeze({
    getState() {
      return state;
    },

    freeze() {
      state = LEGACY_FROZEN;
      return state;
    },

    assertWriteAllowed() {
      return assertLegacyWriteAllowed(state);
    },
  });
}

module.exports = {
  LEGACY_ACTIVE,
  LEGACY_FROZEN,
  assertLegacyWriteAllowed,
  createLegacyWriteGuard,
};
