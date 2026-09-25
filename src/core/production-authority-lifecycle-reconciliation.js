'use strict';

const { assertProductionAuthority } = require('./f03-production-authority-record');
const { assertAuthorityBinding } = require('./f03-authority-binding');

const SELECT = 'SELECT authority_lifecycle_id,state,segment_id,manifest_digest,checkpoint_digest,generation,cursor_block,binding_digest,processing_result_id,processing_execution_id,lineage_id,canonical_decision_snapshot_id,evidence_set_digest,from_block,to_block,expected_segment_id,expected_manifest_digest,expected_checkpoint_digest,source_id,predecessor_lifecycle_id,replacement_type,establishment_input_digest,committed_at FROM production_authority_lifecycle ORDER BY from_block,to_block,authority_lifecycle_id';

const KEYS = [
  'authorityLifecycleId','state','segmentId','manifestDigest','checkpointDigest','generation','cursorBlock','bindingDigest',
  'processingResultId','processingExecutionId','lineageId','canonicalDecisionSnapshotId','evidenceSetDigest','fromBlock','toBlock',
  'expectedSegmentId','expectedManifestDigest','expectedCheckpointDigest','sourceId','predecessorLifecycleId','replacementType',
  'establishmentInputDigest','committedAt',
];

const EXPECTED_KEYS = {
  fromBlock: 'fromBlock',
  toBlock: 'toBlock',
  segmentId: 'expectedSegmentId',
  manifestDigest: 'expectedManifestDigest',
  checkpointDigest: 'expectedCheckpointDigest',
  generation: 'generation',
  cursorBlock: 'cursorBlock',
};

function rowToRecord(row) {
  return Object.freeze(Object.fromEntries(KEYS.map((key, index) => [key, row[index]])));
}

function assertExpectedMatchesRecord(expected, record) {
  if (!expected || typeof expected !== 'object') {
    throw new Error('LIFECYCLE_RECONCILIATION_EXPECTED_SOURCE_INVALID');
  }
  if (expected.status !== 'VERIFIED') {
    throw new Error('LIFECYCLE_RECONCILIATION_EXPECTED_STATUS_INVALID');
  }

  for (const [expectedKey, recordKey] of Object.entries(EXPECTED_KEYS)) {
    if (expected[expectedKey] !== record[recordKey]) {
      throw new Error('LIFECYCLE_RECONCILIATION_EXPECTED_MISMATCH_' + expectedKey.toUpperCase());
    }
  }
}

function reconcileProductionAuthorityLifecycleCursor({
  database,
  cursor,
  expectedAuthorityFactory,
}) {
  if (!database || !database.db) throw new Error('LIFECYCLE_RECONCILIATION_DATABASE_REQUIRED');
  if (!cursor || typeof cursor.get !== 'function' || typeof cursor.advance !== 'function') {
    throw new Error('LIFECYCLE_RECONCILIATION_CURSOR_REQUIRED');
  }
  if (typeof expectedAuthorityFactory !== 'function') {
    throw new Error('LIFECYCLE_RECONCILIATION_EXPECTED_SOURCE_REQUIRED');
  }

  const currentCursor = cursor.get();
  if (currentCursor === null) return { reconciled: 0, cursor: null };
  if (!Number.isInteger(currentCursor) || currentCursor < 0) {
    throw new Error('LIFECYCLE_RECONCILIATION_CURSOR_INVALID');
  }

  const result = database.db.exec(SELECT);
  const rows = result.length ? result[0].values.map(rowToRecord) : [];

  let current = currentCursor;
  let reconciled = 0;

  for (const record of rows) {
    if (record.toBlock <= current) continue;

    if (record.fromBlock <= current) {
      throw new Error('LIFECYCLE_RECONCILIATION_RANGE_OVERLAP');
    }

    if (record.fromBlock !== current + 1) {
      throw new Error('LIFECYCLE_RECONCILIATION_RANGE_GAP');
    }

    if (record.cursorBlock !== record.toBlock) {
      throw new Error('LIFECYCLE_RECONCILIATION_CURSOR_BINDING_INVALID');
    }

    const expected = expectedAuthorityFactory({
      fromBlock: record.fromBlock,
      toBlock: record.toBlock,
    });

    assertExpectedMatchesRecord(expected, record);

    const authority = {
      fromBlock: record.fromBlock,
      toBlock: record.toBlock,
      segmentId: record.segmentId,
      manifestDigest: record.manifestDigest,
      checkpointDigest: record.checkpointDigest,
      generation: record.generation,
      cursorBlock: record.cursorBlock,
      bindingDigest: record.bindingDigest,
    };

    assertProductionAuthority(authority);
    assertAuthorityBinding(authority, expected);

    try {
      cursor.advance(record.toBlock);
    } catch (error) {
      throw new Error(
        'LIFECYCLE_RECONCILIATION_CURSOR_ADVANCE_FAILED',
        { cause: error }
      );
    }

    current = record.toBlock;
    reconciled += 1;
  }

  return { reconciled, cursor: current };
}

module.exports = {
  reconcileProductionAuthorityLifecycleCursor,
};
