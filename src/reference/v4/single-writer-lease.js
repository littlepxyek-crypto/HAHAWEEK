'use strict';

const LEASE_HELD = 'LEASE_HELD';
const FENCE_REJECTED = 'FENCE_REJECTED';
const OWNER_REQUIRED = 'OWNER_REQUIRED';

function createSingleWriterLease() {
  let owner = null;
  let epoch = 0;

  return {
    acquire(nextOwner) {
      if (!nextOwner) throw new Error(OWNER_REQUIRED);
      if (owner !== null) throw Object.assign(new Error(LEASE_HELD), { code: LEASE_HELD });
      owner = nextOwner;
      epoch += 1;
      return Object.freeze({ owner, epoch });
    },

    replace(nextOwner) {
      if (!nextOwner) throw new Error(OWNER_REQUIRED);
      owner = nextOwner;
      epoch += 1;
      return Object.freeze({ owner, epoch });
    },

    assertOwner(token) {
      if (!token || token.owner !== owner || token.epoch !== epoch) {
        throw Object.assign(new Error(FENCE_REJECTED), { code: FENCE_REJECTED });
      }
      return true;
    },

    release(token) {
      this.assertOwner(token);
      owner = null;
      return true;
    },

    snapshot() {
      return { owner, epoch };
    }
  };
}

module.exports = { createSingleWriterLease, LEASE_HELD, FENCE_REJECTED, OWNER_REQUIRED };
