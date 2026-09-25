'use strict';

const { assertProductionAuthority } = require('./f03-production-authority-record');
const { assertAuthorityBinding } = require('./f03-authority-binding');
const { listProductionAuthorityLifecycles, readProductionAuthorityLifecycle } = require('./production-authority-lifecycle');

const FIELDS = [
  'fromBlock',
  'toBlock',
  'segmentId',
  'manifestDigest',
  'checkpointDigest',
  'generation',
  'cursorBlock',
];

function assertExpectedMatchesRecord(expected, record) {
  if (!expected || typeof expected !== 'object') {
    throw new Error('LIFECYCLE_RECONCILIATION_EXPECTED_SOURCE_INVALID');
  }

  for (const key of FIELDS) {
    const expectedKey = key === 'cursorBlock' ? 'cursorBlock' : key;
    const recordKey = key === 'segmentId' ? 'expectedSegmentId'
      : key === 'manifestDigest' ? 'expectedManifestDigest'
      : key === 'checkpointDigest' ? 'expectedCheckpointDigest'
      : key;
    if (expected[expectedKey] !== record[recordKey]) {
      throw new Error('LIFECYCLE_RECONCILIATION_EXPECTED_MISMATCH_' + key.toUpperCase());
    }
  }

  if (expected.status !== 'VERIFIED') {
    throw new Error('LIFECYCLE_RECONCILIATION_EXPECTED_STATUS_INVALID');
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

  const rows = listProductionAuthorityLifecycles(database, 0, Number.MAX_SAFE_INTEGER)
    .map(row => readProductionAuthorityLifecycle(database, row.authorityLifecycleId))
    .sort((a, b) => a.fromBlock - b.fromBlock || a.toBlock - b.toBlock);

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
