'use strict';

/**
 * STEP 529 — production-boundary authority adapter.
 *
 * When supplied, IngestionEngine requires a complete authority record at the
 * exact cursor-advance boundary. The adapter is opt-in so existing legacy
 * behavior is not silently converted into V4 authority.
 */

function createAuthorityGate({ authorityFactory, authorityValidator }) {
  if (typeof authorityFactory !== 'function') throw new Error('AUTHORITY_FACTORY_REQUIRED');
  if (typeof authorityValidator !== 'function') throw new Error('AUTHORITY_VALIDATOR_REQUIRED');

  return ({ fromBlock, toBlock, checkpointCommitted }) => {
    if (checkpointCommitted !== true) throw new Error('CHECKPOINT_NOT_COMMITTED');

    const authority = authorityFactory({ fromBlock, toBlock });
    return authorityValidator(authority);
  };
}

module.exports = { createAuthorityGate };
