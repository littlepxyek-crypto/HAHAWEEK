'use strict';

const {
  CONTRACT_VERSION,
  QUERY_STATUS,
  QUERY_OPERATIONS,
  READ_ONLY_OPERATIONS,
  CURRENTLY_IMPLEMENTED,
  capabilities,
} = require('./evidence-query-contract');
const { createReadOnlyQueryService } = require('./read-only-query-service');

function createAgentReadInterface(database) {
  const service = createReadOnlyQueryService(database);

  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    mode: 'READ_ONLY',
    capabilities,
    execute: service.execute,
  });
}

module.exports = {
  CONTRACT_VERSION,
  QUERY_STATUS,
  QUERY_OPERATIONS,
  READ_ONLY_OPERATIONS,
  CURRENTLY_IMPLEMENTED,
  capabilities,
  createReadOnlyQueryService,
  createAgentReadInterface,
};
