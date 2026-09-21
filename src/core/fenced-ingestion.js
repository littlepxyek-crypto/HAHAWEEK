'use strict';

const { IngestionEngine } = require('./ingestion');

function createFencedIngestionEngine({ lease, leaseToken, ...options }) {
  if (!lease || typeof lease.assertOwner !== 'function') {
    throw new Error('LEASE_REQUIRED');
  }
  if (!leaseToken) {
    throw new Error('LEASE_TOKEN_REQUIRED');
  }

  const assertLease = () => lease.assertOwner(leaseToken);

  return new IngestionEngine({
    ...options,
    processor: async (...args) => {
      assertLease();
      return options.processor(...args);
    },
    processorRange: options.processorRange
      ? async (...args) => {
          assertLease();
          const result = await options.processorRange(...args);
          assertLease();
          return result;
        }
      : undefined,
  });
}

module.exports = { createFencedIngestionEngine };
