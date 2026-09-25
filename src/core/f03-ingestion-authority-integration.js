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
  authorityCommitter,
  writerFence,
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
  return ({ fromBlock, toBlock, checkpointCommitted, processingContext }) => {
    if (writerFence) writerFence.assertOwned();
    if (checkpointCommitted !== true) throw new Error('CHECKPOINT_NOT_COMMITTED');
    if (processingContext !== undefined) {
      if (!processingContext || typeof processingContext !== 'object') {
        throw new Error('PROCESSING_CONTEXT_MISSING');
      }
      if (processingContext.status !== 'VERIFIED') {
        throw new Error('PROCESSING_CONTEXT_NOT_VERIFIED');
      }
      if (processingContext.fromBlock !== fromBlock || processingContext.toBlock !== toBlock) {
        throw new Error('PROCESSING_CONTEXT_RANGE_MISMATCH');
      }
      if (typeof processingContext.generation !== 'string' || processingContext.generation.length === 0) {
        throw new Error('PROCESSING_CONTEXT_GENERATION_MISSING');
      }
    }

    const expected = expectedAuthorityFactory({ fromBlock, toBlock });
    const authority = authorityFactory({ fromBlock, toBlock, processingContext, expectedAuthority: expected });

    if (!authority || typeof authority !== 'object') {
      throw new Error('AUTHORITY_SOURCE_INVALID');
    }

    if (!expected || typeof expected !== 'object') {
      throw new Error('AUTHORITY_EXPECTED_SOURCE_INVALID');
    }

    if (authority === expected) {
      throw new Error('AUTHORITY_EXPECTED_SOURCE_SELF_REFERENCE');
    }

    if (
      authority.fromBlock !== fromBlock ||
      authority.toBlock !== toBlock ||
      expected.fromBlock !== fromBlock ||
      expected.toBlock !== toBlock
    ) {
      throw new Error('AUTHORITY_RANGE_MISMATCH');
    }

    const validated = authorityValidator(authority);
    authorityBindingValidator(authority, expected);

    if (processingContext !== undefined) {
      if (validated.generation !== processingContext.generation) {
        throw new Error('AUTHORITY_GENERATION_CONTEXT_MISMATCH');
      }
      if (validated.cursorBlock !== processingContext.toBlock) {
        throw new Error('AUTHORITY_CURSOR_CONTEXT_MISMATCH');
      }
      if (!writerFence) throw new Error('AUTHORITY_WRITER_FENCE_REQUIRED');
    }
    if (writerFence) writerFence.assertOwned();
    if (typeof authorityCommitter === 'function') {
      authorityCommitter({ fromBlock, toBlock, processingContext, expectedAuthority: expected, authority: validated });
    }

    return validated;
  };
}

module.exports = { createAuthorityGate };
