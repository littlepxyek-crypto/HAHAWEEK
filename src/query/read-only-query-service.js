'use strict';

const {
  CONTRACT_VERSION,
  QUERY_OPERATIONS,
  isSupportedOperation,
  isImplementedOperation,
  capabilities,
} = require('./evidence-query-contract');

const READONLY_SQL_PREFIX = /^(SELECT|PRAGMA|EXPLAIN)\b/i;
const MAX_ROWS = 1000;
const MAX_BLOCK_SPAN = 100000;

function requiredString(value, field) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(field.toUpperCase() + '_REQUIRED');
  return value;
}

function requireDatabase(database) {
  if (!database || !database.db || typeof database.db.prepare !== 'function') throw new Error('READ_ONLY_DATABASE_REQUIRED');
  return database.db;
}

function rowObject(statement) {
  const value = statement.getAsObject();
  return value && Object.keys(value).length ? value : null;
}

function allRows(statement) {
  const rows = [];
  while (statement.step()) rows.push(statement.getAsObject());
  return rows;
}

function safePrepare(db, sql, params) {
  if (!READONLY_SQL_PREFIX.test(sql.trim())) throw new Error('QUERY_MUST_BE_READ_ONLY');
  const statement = db.prepare(sql);
  if (params !== undefined) statement.bind(params);
  return statement;
}

function response(queryId, status, data, extras = {}) {
  return {
    query_id: queryId, schema_version: CONTRACT_VERSION, status, data,
    evidence_refs: extras.evidence_refs || [],
    provenance_refs: extras.provenance_refs || [],
    limitations: extras.limitations || [],
    consistency: extras.consistency || { authority_layer: 'V4', canonicality: 'UNKNOWN', reorg_affected: false },
    generated_at: new Date().toISOString(),
  };
}

function parseJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function createReadOnlyQueryService(database) {
  const db = requireDatabase(database);

  function getEvidence(evidenceId, temporal = {}) {
    requiredString(evidenceId, 'evidence_id');
    const asOf = temporal && temporal.as_of !== undefined ? requiredString(temporal.as_of, 'as_of') : null;
    if (asOf !== null && Number.isNaN(Date.parse(asOf))) throw new Error('AS_OF_INVALID');
    const statement = safePrepare(db, `SELECT ce.evidence_id, ce.identity_schema_version, ce.identity_hash, ce.raw_event_id, ce.raw_hash, ce.canonical_hash, ce.canonical_json, ce.interpretation_status, ce.provenance_json, ce.stored_at, re.chain_id, re.block_number, re.transaction_hash, re.block_hash, re.transaction_index, re.log_index, re.address, re.captured_at FROM canonical_evidence ce LEFT JOIN raw_events re ON re.event_id = ce.raw_event_id WHERE ce.evidence_id = ?`, [evidenceId]);
    const row = rowObject(statement); statement.free();
    if (!row) return response('evidence:' + evidenceId, 'UNKNOWN', null, { limitations: ['EVIDENCE_NOT_FOUND'] });
    const canonical = parseJson(row.canonical_json, {});
    const provenance = parseJson(row.provenance_json, {});
    let temporalState = null;
    let temporalConsistency = { authority_layer: 'V4', canonicality: 'UNKNOWN', reorg_affected: false };
    if (asOf !== null) {
      const transitionStatement = safePrepare(db, `SELECT to_state, committed_at, sequence, transition_hash FROM canonical_transitions WHERE evidence_id = ? AND committed_at <= ? ORDER BY committed_at DESC, CAST(sequence AS INTEGER) DESC LIMIT 1`, [evidenceId, asOf]);
      const transition = rowObject(transitionStatement); transitionStatement.free();
      const state = transition ? transition.to_state : 'UNKNOWN';
      temporalState = { as_of: asOf, canonicality: state === 'CANONICAL' ? 'CANONICAL' : state === 'ORPHANED' ? 'ORPHANED' : 'UNKNOWN', transition: transition || null };
      temporalConsistency = { authority_layer: 'V4', snapshot_ref: null, manifest_ref: null, checkpoint_ref: null, canonicality: temporalState.canonicality, reorg_affected: state === 'ORPHANED' };
    }
    return response('evidence:' + evidenceId, 'COMPLETE', {
      evidence_id: row.evidence_id, identity_schema_version: row.identity_schema_version, identity_hash: row.identity_hash,
      raw_event_id: row.raw_event_id, raw_hash: row.raw_hash, canonical_hash: row.canonical_hash, canonical,
      interpretation_status: row.interpretation_status, provenance, stored_at: row.stored_at,
      location: { chain_id: row.chain_id, block_number: row.block_number, transaction_hash: row.transaction_hash, block_hash: row.block_hash, transaction_index: row.transaction_index, log_index: row.log_index, address: row.address },
      observation: { captured_at: row.captured_at },
      temporal: temporalState,
    }, {
      consistency: temporalConsistency,
      limitations: asOf === null ? ['CURRENT_SCHEMA_DOES_NOT_EXPOSE_A_CANONICALITY_JOIN_FOR_EACH_EVIDENCE_ID'] : ['AS_OF_STATE_RECONSTRUCTED_FROM_APPEND_ONLY_CANONICAL_TRANSITIONS'],
      evidence_refs: [{ evidence_id: row.evidence_id, evidence_type: canonical.evidence_type || null, chain_id: row.chain_id, event_time: canonical.event_time || null, observation_time: row.captured_at, processing_time: row.stored_at, canonicality: 'UNKNOWN', acquisition_ref: provenance.acquisition_id || null, source_lineage_ref: provenance.source_lineage_id || null }],
      provenance_refs: [provenance],
    });
  }

  function getEvidenceLineage(evidenceId, temporal = {}) {
    const result = getEvidence(evidenceId, temporal);
    if (result.status !== 'COMPLETE') return result;
    return response('lineage:' + evidenceId, 'COMPLETE', {
      evidence_id: result.data.evidence_id, acquisition: result.data.provenance,
      source: { source_id: result.data.provenance.source_id || null, source_type: result.data.provenance.source_type || null },
      observation: result.data.observation,
      digest: { raw_hash: result.data.raw_hash, canonical_hash: result.data.canonical_hash, identity_hash: result.data.identity_hash },
    }, { evidence_refs: result.evidence_refs, provenance_refs: result.provenance_refs, limitations: result.limitations });
  }

  function getBlockContext(chainId, blockNumber) {
    if (!Number.isInteger(chainId) || chainId < 0) throw new Error('CHAIN_ID_INVALID');
    if (!Number.isInteger(blockNumber) || blockNumber < 0) throw new Error('BLOCK_NUMBER_INVALID');
    const statement = safePrepare(db, `SELECT re.chain_id, re.block_number, re.block_hash, COUNT(*) AS raw_event_count FROM raw_events re WHERE re.chain_id = ? AND re.block_number = ? GROUP BY re.chain_id, re.block_number, re.block_hash ORDER BY re.block_hash LIMIT ${MAX_ROWS + 1}`, [chainId, blockNumber]);
    const bounded = boundedRows(allRows(statement)); statement.free();
    const rows = bounded.rows;
    if (!rows.length) return response('block:' + chainId + ':' + blockNumber, 'UNKNOWN', null, { limitations: ['BLOCK_NOT_FOUND_IN_RAW_EVENT_SCOPE'] });
    return response('block:' + chainId + ':' + blockNumber, bounded.partial ? 'PARTIAL' : 'COMPLETE', { chain_id: chainId, block_number: blockNumber, observations: rows }, { limitations: ['BLOCK_CONTEXT_IS_EVIDENCE_SCOPED; PROVIDER_LEVEL_ABSENCE_IS_NOT_INFERRED'] });
  }

  function boundedRows(rows) {
    const partial = rows.length > MAX_ROWS;
    return { rows: partial ? rows.slice(0, MAX_ROWS) : rows, partial };
  }

  function getTransactionContext(chainId, transactionHash) {
    if (!Number.isInteger(chainId) || chainId < 0) throw new Error('CHAIN_ID_INVALID');
    requiredString(transactionHash, 'transaction_hash');
    const statement = safePrepare(db, `SELECT re.event_id, re.chain_id, re.block_number, re.transaction_hash, re.block_hash, re.transaction_index, re.log_index, re.address, re.topics_json, re.data, re.captured_at, ce.evidence_id, ce.identity_hash, ce.canonical_hash FROM raw_events re LEFT JOIN canonical_evidence ce ON ce.raw_event_id = re.event_id WHERE re.chain_id = ? AND re.transaction_hash = ? ORDER BY re.log_index LIMIT ${MAX_ROWS + 1}`, [chainId, transactionHash]);
    const bounded = boundedRows(allRows(statement)); statement.free();
    const rows = bounded.rows;
    if (!rows.length) return response('tx:' + chainId + ':' + transactionHash, 'UNKNOWN', null, { limitations: ['TRANSACTION_NOT_FOUND_IN_RAW_EVENT_SCOPE'] });
    return response('tx:' + chainId + ':' + transactionHash, bounded.partial ? 'PARTIAL' : 'COMPLETE', { chain_id: chainId, transaction_hash: transactionHash, events: rows.map(row => ({ event_id: row.event_id, evidence_id: row.evidence_id, block_number: row.block_number, block_hash: row.block_hash, transaction_index: row.transaction_index, log_index: row.log_index, address: row.address, topics: parseJson(row.topics_json, []), data: row.data, captured_at: row.captured_at, identity_hash: row.identity_hash, canonical_hash: row.canonical_hash })) });
  }

  function getWalletActivity(chainId, address, startBlock = null, endBlock = null) {
    if (!Number.isInteger(chainId) || chainId < 0) throw new Error('CHAIN_ID_INVALID');
    requiredString(address, 'address');
    if (startBlock !== null && (!Number.isInteger(startBlock) || startBlock < 0)) throw new Error('START_BLOCK_INVALID');
    if (endBlock !== null && (!Number.isInteger(endBlock) || endBlock < 0)) throw new Error('END_BLOCK_INVALID');
    if (startBlock !== null && endBlock !== null && startBlock > endBlock) throw new Error('BLOCK_RANGE_INVALID');
    if (startBlock !== null && endBlock !== null && endBlock - startBlock > MAX_BLOCK_SPAN) throw new Error('BLOCK_RANGE_TOO_LARGE');
    const statement = safePrepare(db, `SELECT event_id, chain_id, pool_id, pool_manager, sender AS address, tick_lower, tick_upper, liquidity_delta, salt, block_number, transaction_hash, log_index, captured_at FROM liquidity_events WHERE chain_id = ? AND lower(sender) = lower(?) AND (? IS NULL OR block_number >= ?) AND (? IS NULL OR block_number <= ?) ORDER BY block_number, log_index LIMIT ${MAX_ROWS + 1}`, [chainId, address, startBlock, startBlock, endBlock, endBlock]);
    const bounded = boundedRows(allRows(statement)); statement.free();
    const rows = bounded.rows;
    return response('wallet:' + chainId + ':' + address, bounded.partial ? 'PARTIAL' : 'COMPLETE', { chain_id: chainId, address, observed_liquidity_events: rows, scope: { start_block: startBlock, end_block: endBlock } }, { limitations: ['CURRENT_SCHEMA_EXPOSES_LIQUIDITY_EVENTS_FOR_WALLET_ACTIVITY', 'SWAP_SENDER_ACTIVITY_IS_NOT_YET_EXPOSED_BY_A_DEDICATED_AUTHORITY_TABLE', 'NO_IDENTITY_INFERENCE_IS_PERFORMED'] });
  }

  function getPoolContext(chainId, poolId) {
    if (!Number.isInteger(chainId) || chainId < 0) throw new Error('CHAIN_ID_INVALID');
    requiredString(poolId, 'pool_id');
    const poolStatement = safePrepare(db, `SELECT * FROM pools WHERE chain_id = ? AND pool_id = ?`, [chainId, poolId]);
    const pool = rowObject(poolStatement); poolStatement.free();
    const liquidityStatement = safePrepare(db, `SELECT * FROM liquidity_events WHERE chain_id = ? AND pool_id = ? ORDER BY block_number, log_index LIMIT ${MAX_ROWS + 1}`, [chainId, poolId]);
    const liquidityBounded = boundedRows(allRows(liquidityStatement)); liquidityStatement.free();
    const liquidityEvents = liquidityBounded.rows;
    const flowStatement = safePrepare(db, `SELECT * FROM flow_windows WHERE chain_id = ? AND pool_id = ? ORDER BY window_start LIMIT ${MAX_ROWS + 1}`, [chainId, poolId]);
    const flowBounded = boundedRows(allRows(flowStatement)); flowStatement.free();
    const flowWindows = flowBounded.rows;
    if (!pool && !liquidityEvents.length && !flowWindows.length) return response('pool:' + chainId + ':' + poolId, 'UNKNOWN', null, { limitations: ['POOL_NOT_FOUND_IN_CURRENT_READ_SCOPE'] });
    return response('pool:' + chainId + ':' + poolId, (liquidityBounded.partial || flowBounded.partial) ? 'PARTIAL' : 'COMPLETE', { pool, liquidity_events: liquidityEvents, flow_windows: flowWindows }, { limitations: ['POOL_CONTEXT_IS_READ_ONLY', 'CURRENT_SCHEMA_DOES_NOT_EXPOSE_A_DEDICATED_FIRST_SWAP_AUTHORITY_TABLE'] });
  }

  function execute(operation, input = {}) {
    if (!isSupportedOperation(operation)) throw new Error('QUERY_OPERATION_UNSUPPORTED');
    if (!isImplementedOperation(operation)) throw new Error('QUERY_OPERATION_NOT_IMPLEMENTED');
    switch (operation) {
      case QUERY_OPERATIONS.GET_EVIDENCE: return getEvidence(requiredString(input.evidence_id, 'evidence_id'), input.temporal || {});
      case QUERY_OPERATIONS.GET_EVIDENCE_LINEAGE: return getEvidenceLineage(requiredString(input.evidence_id, 'evidence_id'), input.temporal || {});
      case QUERY_OPERATIONS.GET_BLOCK_CONTEXT: return getBlockContext(input.chain_id, input.block_number);
      case QUERY_OPERATIONS.GET_TRANSACTION_CONTEXT: return getTransactionContext(input.chain_id, input.transaction_hash);
      case QUERY_OPERATIONS.GET_WALLET_ACTIVITY: return getWalletActivity(input.chain_id, input.address, input.start_block, input.end_block);
      case QUERY_OPERATIONS.GET_POOL_CONTEXT: return getPoolContext(input.chain_id, input.pool_id);
      default: throw new Error('QUERY_OPERATION_NOT_IMPLEMENTED');
    }
  }

  return Object.freeze({ contractVersion: CONTRACT_VERSION, capabilities, execute, getEvidence, getEvidenceLineage, getBlockContext, getTransactionContext, getWalletActivity, getPoolContext });
}

module.exports = { createReadOnlyQueryService };