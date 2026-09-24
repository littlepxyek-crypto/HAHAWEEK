'use strict';

/**
 * STEP 529–547 — production-boundary authority adapter.
 *
 * The adapter remains the fail-closed authority gate immediately before
 * cursor advancement. STEP 547 requires the expected authority commitments
 * to come from a distinct explicit source for the exact processed range.
 */

function createAuthorityGate({
  authorityFactory,
  expectedAuthorityFactory,
  authorityValidator,
  authorityBindingValidator,
}) {
  if (typeof authorityFactory !== 'function') throw new Error('AUTHORITY_FACTORY_REQUIRED');
  if (typeof expectedAuthorityFactory !== 'function') {
    throw new Error('AUTHORITY_EXPECTED_SOURCE_REQUIRED');
  }
  if (authorityFactory === expectedAuthorityFactory) {
    throw new Error('AUTHORITY_EXPECTED_SOURCE_MUST_BE_DISTINCT');
  }
  if (typeof authorityValidator !== 'function') throw new Error('AUTHORITY_VALIDATOR_REQUIRED');
  if (typeof authorityBindingValidator !== 'function') {
    throw new Error('AUTHORITY_BINDING_VALIDATOR_REQUIRED');
  }

  return ({ fromBlock, toBlock, checkpointCommitted }) => {
    if (checkpointCommitted !== true) throw new Error('CHECKPOINT_NOT_COMMITTED');

    const authority = authorityFactory({ fromBlock, toBlock });
    const expected = expectedAuthorityFactory({ fromBlock, toBlock });

    if (!authority || typeof authority !== 'object') {
      throw new Error('AUTHORITY_SOURCE_INVALID');
    }

    if (!expected || typeof expected !== 'object') {
      throw new Error('AUTHORITY_EXPECTED_SOURCE_INVALID');
    }

    if (authority === expected) {
      throw new Error('AUTHORITY_EXPECTED_SOURCE_SELF_REFERENCE');
    }

    if (authority.cursorBlock !== toBlock || expected.cursorBlock !== toBlock) {
      throw new Error('AUTHORITY_RANGE_MISMATCH');
    }

    const validated = authorityValidator(authority);
    authorityBindingValidator(authority, expected);

    return validated;
  };
}

module.exports = { createAuthorityGate };
