'use strict';

/**
 * STEP 529–545 — production-boundary authority adapter.
 *
 * The adapter remains the fail-closed authority gate immediately before
 * cursor advancement. STEP 545 requires cryptographic binding validation
 * against an independently supplied expected authority commitment.
 */

function createAuthorityGate({ authorityFactory, authorityValidator, authorityBindingValidator }) {
  if (typeof authorityFactory !== 'function') throw new Error('AUTHORITY_FACTORY_REQUIRED');
  if (typeof authorityValidator !== 'function') throw new Error('AUTHORITY_VALIDATOR_REQUIRED');
  if (typeof authorityBindingValidator !== 'function') {
    throw new Error('AUTHORITY_BINDING_VALIDATOR_REQUIRED');
  }

  return ({ fromBlock, toBlock, checkpointCommitted }) => {
    if (checkpointCommitted !== true) throw new Error('CHECKPOINT_NOT_COMMITTED');

    const source = authorityFactory({ fromBlock, toBlock });

    if (!source || typeof source !== 'object' || !source.authority || !source.expected) {
      throw new Error('AUTHORITY_BINDING_SOURCE_REQUIRED');
    }

    const authority = authorityValidator(source.authority);
    authorityBindingValidator(source.authority, source.expected);

    return authority;
  };
}

module.exports = { createAuthorityGate };
