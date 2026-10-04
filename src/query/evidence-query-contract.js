'use strict';

/**
 * HAHAWEEK Evidence Query Contract v1 — executable boundary.
 *
 * This module intentionally contains no database writes and no arbitrary SQL.
 * It defines the only query names exposed to future Agent consumers.
 */

const CONTRACT_VERSION = 'EQC-1.0';

const QUERY_STATUS = Object.freeze([
  'COMPLETE',
  'PARTIAL',
  'UNKNOWN',
  'INCOMPLETE',
  'ERROR',
]);

const QUERY_OPERATIONS = Object.freeze({
  GET_EVIDENCE: 'get_evidence',
  GET_EVIDENCE_LINEAGE: 'get_evidence_lineage',
  GET_BLOCK_CONTEXT: 'get_block_context',
  GET_TRANSACTION_CONTEXT: 'get_transaction_context',
  GET_WALLET_ACTIVITY: 'get_wallet_activity',
  GET_POOL_CONTEXT: 'get_pool_context',
  GET_GRAPH_CONTEXT: 'get_graph_context',
  GET_FORMATION_CONTEXT: 'get_formation_context',
  GET_HYPOTHESIS_CONTEXT: 'get_hypothesis_context',
  GET_VALIDATION_CONTEXT: 'get_validation_context',
  GET_RADAR_RECORD: 'get_radar_record',
  GET_RESEARCH_CONTEXT: 'get_research_context',
  GET_CLAIM_PROVENANCE: 'get_claim_provenance',
});

const READ_ONLY_OPERATIONS = Object.freeze([
  QUERY_OPERATIONS.GET_EVIDENCE,
  QUERY_OPERATIONS.GET_EVIDENCE_LINEAGE,
  QUERY_OPERATIONS.GET_BLOCK_CONTEXT,
  QUERY_OPERATIONS.GET_TRANSACTION_CONTEXT,
  QUERY_OPERATIONS.GET_WALLET_ACTIVITY,
  QUERY_OPERATIONS.GET_POOL_CONTEXT,
  QUERY_OPERATIONS.GET_GRAPH_CONTEXT,
  QUERY_OPERATIONS.GET_FORMATION_CONTEXT,
  QUERY_OPERATIONS.GET_HYPOTHESIS_CONTEXT,
  QUERY_OPERATIONS.GET_VALIDATION_CONTEXT,
  QUERY_OPERATIONS.GET_RADAR_RECORD,
  QUERY_OPERATIONS.GET_RESEARCH_CONTEXT,
  QUERY_OPERATIONS.GET_CLAIM_PROVENANCE,
]);

const CURRENTLY_IMPLEMENTED = Object.freeze([
  QUERY_OPERATIONS.GET_EVIDENCE,
  QUERY_OPERATIONS.GET_EVIDENCE_LINEAGE,
  QUERY_OPERATIONS.GET_BLOCK_CONTEXT,
  QUERY_OPERATIONS.GET_TRANSACTION_CONTEXT,
  QUERY_OPERATIONS.GET_WALLET_ACTIVITY,
  QUERY_OPERATIONS.GET_POOL_CONTEXT,
]);

function isSupportedOperation(operation) {
  return READ_ONLY_OPERATIONS.includes(operation);
}

function isImplementedOperation(operation) {
  return CURRENTLY_IMPLEMENTED.includes(operation);
}

function capabilities() {
  return Object.freeze({
    contract_version: CONTRACT_VERSION,
    mode: 'READ_ONLY',
    authority_write: false,
    arbitrary_sql: false,
    supported_operations: [...CURRENTLY_IMPLEMENTED],
    planned_operations: READ_ONLY_OPERATIONS.filter(op => !CURRENTLY_IMPLEMENTED.includes(op)),
  });
}

module.exports = {
  CONTRACT_VERSION,
  QUERY_STATUS,
  QUERY_OPERATIONS,
  READ_ONLY_OPERATIONS,
  CURRENTLY_IMPLEMENTED,
  isSupportedOperation,
  isImplementedOperation,
  capabilities,
};
