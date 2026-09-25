'use strict';

const crypto = require('node:crypto');
const { assertProductionAuthority } = require('./f03-production-authority-record');
const { createAuthorityBindingDigest } = require('./f03-authority-binding');

const DOMAIN = 'HAHAWEEK-EVIDENCE-V4-PRODUCTION-AUTHORITY-LIFECYCLE';
const VERSION = '1';
const HASH = /^[0-9a-f]{64}$/;

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('LIFECYCLE_CANONICAL_NUMBER_INVALID');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
  }
  throw new Error('LIFECYCLE_CANONICAL_VALUE_INVALID');
}

function digest(value) {
  return crypto.createHash('sha256')
    .update(Buffer.from(DOMAIN + '\0', 'utf8'))
    .update(Buffer.from(canonicalize(value), 'utf8'))
    .digest('hex');
}

function assertContext(context, fromBlock, toBlock) {
  if (!context || context.status !== 'VERIFIED') throw new Error('PROCESSING_CONTEXT_NOT_VERIFIED');
  if (context.fromBlock !== fromBlock || context.toBlock !== toBlock) throw new Error('PROCESSING_CONTEXT_RANGE_MISMATCH');
  if (typeof context.generation !== 'string' || context.generation === '') throw new Error('PROCESSING_CONTEXT_GENERATION_MISSING');
  if (!Number.isInteger(context.toBlock) || context.toBlock < 0) throw new Error('PROCESSING_CONTEXT_CURSOR_INVALID');
  for (const key of ['processingResultId','processingExecutionId','lineageId','canonicalDecisionSnapshotId','evidenceSetDigest']) {
    if (typeof context[key] !== 'string' || context[key] === '') throw new Error('PROCESSING_CONTEXT_' + key.toUpperCase() + '_MISSING');
  }
}

function assertExpected(expected, fromBlock, toBlock, context) {
  if (!expected || expected.status !== 'VERIFIED') throw new Error('AUTHORITY_EXPECTED_SOURCE_INVALID');
  if (expected.fromBlock !== fromBlock || expected.toBlock !== toBlock) throw new Error('AUTHORITY_RANGE_MISMATCH');
  if (expected.generation !== context.generation) throw new Error('AUTHORITY_GENERATION_CONTEXT_MISMATCH');
  if (expected.cursorBlock !== toBlock) throw new Error('AUTHORITY_CURSOR_CONTEXT_MISMATCH');
  for (const key of ['segmentId','manifestDigest','checkpointDigest']) {
    if (typeof expected[key] !== 'string' || expected[key] === '') throw new Error('AUTHORITY_EXPECTED_' + key.toUpperCase() + '_MISSING');
  }
}

function rowToObject(row) {
  const keys = [
    'authorityLifecycleId','state','segmentId','manifestDigest','checkpointDigest','generation','cursorBlock','bindingDigest',
    'processingResultId','processingExecutionId','lineageId','canonicalDecisionSnapshotId','evidenceSetDigest','fromBlock','toBlock',
    'expectedSegmentId','expectedManifestDigest','expectedCheckpointDigest','sourceId','predecessorLifecycleId','replacementType',
    'establishmentInputDigest','committedAt'
  ];
  return Object.fromEntries(keys.map((key, i) => [key, row[i]]));
}

function readProductionAuthorityLifecycle(database, authorityLifecycleId) {
  if (!database || !database.db) throw new Error('LIFECYCLE_DATABASE_REQUIRED');
  if (typeof authorityLifecycleId !== 'string' || authorityLifecycleId === '') throw new Error('LIFECYCLE_ID_INVALID');
  const result = database.db.exec(
    'SELECT authority_lifecycle_id,state,segment_id,manifest_digest,checkpoint_digest,generation,cursor_block,binding_digest,processing_result_id,processing_execution_id,lineage_id,canonical_decision_snapshot_id,evidence_set_digest,from_block,to_block,expected_segment_id,expected_manifest_digest,expected_checkpoint_digest,source_id,predecessor_lifecycle_id,replacement_type,establishment_input_digest,committed_at FROM production_authority_lifecycle WHERE authority_lifecycle_id = ?',
    [authorityLifecycleId]
  );
  if (!result.length || result[0].values.length !== 1) throw new Error('LIFECYCLE_NOT_FOUND');
  const record = rowToObject(result[0].values[0]);
  if (record.state !== 'DURABLY_ESTABLISHED') throw new Error('LIFECYCLE_STATE_INVALID');
  if (!HASH.test(record.bindingDigest) || !HASH.test(record.establishmentInputDigest)) throw new Error('LIFECYCLE_INTEGRITY_INVALID');
  return Object.freeze(record);
}

function listProductionAuthorityLifecycles(database, fromBlock, toBlock) {
  if (!database || !database.db) throw new Error('LIFECYCLE_DATABASE_REQUIRED');
  const result = database.db.exec(
    'SELECT authority_lifecycle_id,state,segment_id,manifest_digest,checkpoint_digest,generation,cursor_block,binding_digest,processing_result_id,processing_execution_id,lineage_id,canonical_decision_snapshot_id,evidence_set_digest,from_block,to_block,expected_segment_id,expected_manifest_digest,expected_checkpoint_digest,source_id,predecessor_lifecycle_id,replacement_type,establishment_input_digest,committed_at FROM production_authority_lifecycle WHERE from_block = ? AND to_block = ? ORDER BY authority_lifecycle_id',
    [fromBlock, toBlock]
  );
  return result.length ? result[0].values.map(rowToObject) : [];
}

function establishProductionAuthorityLifecycle({ database, writerFence, processingContext, expectedAuthority, sourceId = 'runtime-production-authority' }) {
  if (!database || !database.db) throw new Error('LIFECYCLE_DATABASE_REQUIRED');
  if (!writerFence || typeof writerFence.assertOwned !== 'function') throw new Error('AUTHORITY_WRITER_FENCE_REQUIRED');
  const fromBlock = processingContext?.fromBlock;
  const toBlock = processingContext?.toBlock;
  assertContext(processingContext, fromBlock, toBlock);
  writerFence.assertOwned();
  assertExpected(expectedAuthority, fromBlock, toBlock, processingContext);

  const authority = {
    fromBlock,
    toBlock,
    segmentId: expectedAuthority.segmentId,
    manifestDigest: expectedAuthority.manifestDigest,
    checkpointDigest: expectedAuthority.checkpointDigest,
    generation: expectedAuthority.generation,
    cursorBlock: expectedAuthority.cursorBlock,
  };
  const bindingDigest = createAuthorityBindingDigest(authority);
  authority.bindingDigest = bindingDigest;
  assertProductionAuthority(authority);

  let predecessor = null;
  if (processingContext.parentResultId) {
    const predecessorRows = database.db.exec(
      'SELECT authority_lifecycle_id FROM production_authority_lifecycle WHERE processing_result_id = ? ORDER BY authority_lifecycle_id',
      [processingContext.parentResultId]
    );
    const rows = predecessorRows.length ? predecessorRows[0].values : [];
    if (processingContext.transitionType === 'REORG_REPLACEMENT' && rows.length !== 1) {
      throw new Error(rows.length === 0
        ? 'LIFECYCLE_REORG_PREDECESSOR_MISSING'
        : 'LIFECYCLE_REORG_PREDECESSOR_AMBIGUOUS');
    }
    if (rows.length === 1) predecessor = rows[0][0];
  }

  const replacementType = processingContext.transitionType === 'REORG_REPLACEMENT'
    ? 'REORG_REPLACEMENT'
    : null;

  const input = {
    version: VERSION,
    sourceId,
    fromBlock,
    toBlock,
    generation: processingContext.generation,
    cursorBlock: toBlock,
    processingResultId: processingContext.processingResultId,
    processingExecutionId: processingContext.processingExecutionId,
    lineageId: processingContext.lineageId,
    canonicalDecisionSnapshotId: processingContext.canonicalDecisionSnapshotId,
    evidenceSetDigest: processingContext.evidenceSetDigest,
    expectedSegmentId: expectedAuthority.segmentId,
    expectedManifestDigest: expectedAuthority.manifestDigest,
    expectedCheckpointDigest: expectedAuthority.checkpointDigest,
    segmentId: authority.segmentId,
    manifestDigest: authority.manifestDigest,
    checkpointDigest: authority.checkpointDigest,
    bindingDigest,
    predecessorLifecycleId: predecessor,
    replacementType,
  };
  const establishmentInputDigest = digest(input);
  const authorityLifecycleId = establishmentInputDigest;

  const existing = database.db.exec(
    'SELECT authority_lifecycle_id,state,segment_id,manifest_digest,checkpoint_digest,generation,cursor_block,binding_digest,processing_result_id,processing_execution_id,lineage_id,canonical_decision_snapshot_id,evidence_set_digest,from_block,to_block,expected_segment_id,expected_manifest_digest,expected_checkpoint_digest,source_id,predecessor_lifecycle_id,replacement_type,establishment_input_digest,committed_at FROM production_authority_lifecycle WHERE authority_lifecycle_id = ?',
    [authorityLifecycleId]
  );

  if (existing.length && existing[0].values.length === 1) {
    const record = rowToObject(existing[0].values[0]);
    if (record.establishmentInputDigest !== establishmentInputDigest || record.bindingDigest !== bindingDigest) {
      throw new Error('LIFECYCLE_IDENTITY_CONFLICT');
    }
    return authority;
  }

  writerFence.assertOwned();
  const snapshot = database.snapshot();
  const committedAt = new Date().toISOString();

  try {
    database.db.run(
      'INSERT INTO production_authority_lifecycle (authority_lifecycle_id,state,segment_id,manifest_digest,checkpoint_digest,generation,cursor_block,binding_digest,processing_result_id,processing_execution_id,lineage_id,canonical_decision_snapshot_id,evidence_set_digest,from_block,to_block,expected_segment_id,expected_manifest_digest,expected_checkpoint_digest,source_id,predecessor_lifecycle_id,replacement_type,establishment_input_digest,committed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        authorityLifecycleId,'DURABLY_ESTABLISHED',authority.segmentId,authority.manifestDigest,authority.checkpointDigest,
        authority.generation,authority.cursorBlock,bindingDigest,processingContext.processingResultId,processingContext.processingExecutionId,
        processingContext.lineageId,processingContext.canonicalDecisionSnapshotId,processingContext.evidenceSetDigest,fromBlock,toBlock,
        expectedAuthority.segmentId,expectedAuthority.manifestDigest,expectedAuthority.checkpointDigest,sourceId,predecessor,replacementType,
        establishmentInputDigest,committedAt
      ]
    );
    writerFence.assertOwned();
    database.save();
    const durable = readProductionAuthorityLifecycle(database, authorityLifecycleId);
    if (durable.establishmentInputDigest !== establishmentInputDigest) throw new Error('LIFECYCLE_DURABILITY_CONFLICT');
    return authority;
  } catch (error) {
    database.restore(snapshot);
    throw error;
  }
}

module.exports = {
  DOMAIN,
  establishProductionAuthorityLifecycle,
  readProductionAuthorityLifecycle,
  listProductionAuthorityLifecycles,
};
