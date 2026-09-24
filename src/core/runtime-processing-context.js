'use strict';

const {
  createCanonicalDecisionInput,
  reconstructSnapshot,
  findBranchCommonAncestor,
} = require('./canonical-decision-input');
const {
  acceptCanonicalLineage,
  reconstructLineage,
} = require('./runtime-canonical-lineage');

const MAX_UINT64 = 18446744073709551615n;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function assertBlock(value, code) {
  if (!Number.isSafeInteger(value) || value < 0) fail(code);
  return value;
}

function assertWriter(writerFence) {
  if (!writerFence || typeof writerFence.assertOwned !== 'function') {
    fail('PROCESSING_CONTEXT_WRITER_FENCE_REQUIRED');
  }
  writerFence.assertOwned();
}

function queryLineages(database, fromBlock, toBlock) {
  const rows = database.db.exec(
    'SELECT lineage_id FROM canonical_lineage WHERE from_block <= ? AND to_block >= ? ORDER BY from_block, to_block, lineage_id',
    [toBlock, fromBlock]
  );
  return rows.length ? rows[0].values.map(row => row[0]) : [];
}

function snapshotForLineage(database, lineage) {
  const snapshotId = lineage.provenance && lineage.provenance.canonical_decision_snapshot_id;
  if (typeof snapshotId !== 'string' || snapshotId.length === 0) {
    fail('PROCESSING_CONTEXT_PARENT_SNAPSHOT_MISSING');
  }
  return reconstructSnapshot(database.db, snapshotId);
}

function blockHash(snapshot, blockNumber) {
  const record = snapshot.records.find(row => row.block_number === blockNumber);
  return record ? record.block_hash : null;
}

function assertContinuationParent(database, snapshot, parent) {
  if (parent.toBlock !== snapshot.from_block - 1) fail('PROCESSING_CONTEXT_PARENT_RANGE_INVALID');
  const parentSnapshot = snapshotForLineage(database, parent);
  const expectedParentHash = snapshot.records[0]?.parent_block_hash;
  if (snapshot.from_block > 0 && expectedParentHash !== blockHash(parentSnapshot, parent.toBlock)) {
    fail('PROCESSING_CONTEXT_BRANCH_MISMATCH');
  }
}

function resolveTransition({ database, snapshot, fromBlock, toBlock, requestedTransitionType }) {
  if (requestedTransitionType && !['INITIAL', 'CONTINUATION', 'REORG_REPLACEMENT'].includes(requestedTransitionType)) {
    fail('PROCESSING_CONTEXT_TRANSITION_INVALID');
  }

  const candidates = queryLineages(database, fromBlock, toBlock)
    .map(id => reconstructLineage(database, id));

  if (fromBlock === 0 && candidates.length === 0) {
    return { transitionType: 'INITIAL', parentResultId: null, generation: '1' };
  }

  const adjacent = [];
  const conflicts = [];

  for (const lineage of candidates) {
    if (lineage.toBlock === fromBlock - 1) adjacent.push(lineage);
    const parentSnapshot = snapshotForLineage(database, lineage);
    const start = Math.max(fromBlock, lineage.fromBlock);
    const end = Math.min(toBlock, lineage.toBlock);
    for (let block = start; block <= end; block += 1) {
      if (blockHash(parentSnapshot, block) !== blockHash(snapshot, block)) {
        conflicts.push(lineage);
        break;
      }
    }
  }

  if (requestedTransitionType === 'INITIAL') {
    if (adjacent.length || candidates.length) fail('PROCESSING_CONTEXT_INITIAL_CONFLICT');
    return { transitionType: 'INITIAL', parentResultId: null, generation: '1' };
  }

  if (requestedTransitionType === 'REORG_REPLACEMENT' || conflicts.length > 0) {
    const parents = [...new Map(conflicts.map(x => [x.processingResultId, x])).values()];
    if (parents.length !== 1) fail('PROCESSING_CONTEXT_REORG_PARENT_AMBIGUOUS');
    const parent = parents[0];
    const parentSnapshot = snapshotForLineage(database, parent);
    const differingBlock = snapshot.records.find(record =>
      blockHash(parentSnapshot, record.block_number) !== record.block_hash
    );
    if (!differingBlock) fail('PROCESSING_CONTEXT_REORG_CONFLICT_MISSING');
    findBranchCommonAncestor(database.db, {
      chainId: snapshot.chain_id,
      firstBlockHash: differingBlock.block_hash,
      secondBlockHash: blockHash(parentSnapshot, differingBlock.block_number),
    });
    const next = BigInt(parent.generation) + 1n;
    if (next > MAX_UINT64) fail('PROCESSING_CONTEXT_GENERATION_OVERFLOW');
    return {
      transitionType: 'REORG_REPLACEMENT',
      parentResultId: parent.processingResultId,
      generation: next.toString(),
    };
  }

  if (adjacent.length !== 1) fail(adjacent.length === 0
    ? 'PROCESSING_CONTEXT_PARENT_MISSING'
    : 'PROCESSING_CONTEXT_PARENT_AMBIGUOUS');

  const parent = adjacent[0];
  assertContinuationParent(database, snapshot, parent);
  return {
    transitionType: 'CONTINUATION',
    parentResultId: parent.processingResultId,
    generation: parent.generation,
  };
}

async function createVerifiedProcessingContext({
  database,
  provider,
  writerFence,
  rawIngest,
  fromBlock,
  toBlock,
  confirmations,
  chainId,
  sourceId,
  latestBlock,
  transitionType,
  provenance = {},
  committedAt = new Date().toISOString(),
}) {
  assertBlock(fromBlock, 'PROCESSING_CONTEXT_FROM_BLOCK_INVALID');
  assertBlock(toBlock, 'PROCESSING_CONTEXT_TO_BLOCK_INVALID');
  if (fromBlock > toBlock) fail('PROCESSING_CONTEXT_RANGE_INVALID');
  assertWriter(writerFence);

  const outerSnapshot = database.snapshot();
  let durable = false;

  try {
    const decisionSnapshot = await createCanonicalDecisionInput({
      provider,
      db: database.db,
      writerFence,
      chainId,
      confirmations,
      sourceId,
      latestBlock,
      fromBlock,
      toBlock,
      acquiredAt: committedAt,
    });

    assertWriter(writerFence);
    await rawIngest(fromBlock, toBlock);

    assertWriter(writerFence);
    const resolved = resolveTransition({
      database,
      snapshot: decisionSnapshot,
      fromBlock,
      toBlock,
      requestedTransitionType: transitionType,
    });

    const lineage = await acceptCanonicalLineage({
      database,
      writerFence,
      canonicalDecisionSnapshot: decisionSnapshot,
      fromBlock,
      toBlock,
      transitionType: resolved.transitionType,
      parentResultId: resolved.parentResultId,
      generation: resolved.generation,
      provenance,
      committedAt,
    });

    assertWriter(writerFence);
    durable = true;

    const context = Object.freeze({
      status: 'VERIFIED',
      fromBlock,
      toBlock,
      processingResultId: lineage.processingResultId,
      processingExecutionId: lineage.processingResultId
        ? require('./processing-result-persistence').readProcessingResult(database, lineage.processingResultId).processingExecutionId
        : null,
      parentResultId: lineage.parentResultId,
      transitionType: lineage.transitionType,
      generation: lineage.generation,
      canonicalEvidenceIds: Object.freeze([...lineage.canonicalEvidenceIds]),
      emptyResult: lineage.canonicalEvidenceIds.length === 0,
      evidenceSetDigest: lineage.canonicalEvidenceSetDigest,
      lineageId: lineage.lineageId,
      provenance: Object.freeze({
        ...lineage.provenance,
        canonical_decision_snapshot_id: decisionSnapshot.snapshot_id,
      }),
      committedAt: lineage.committedAt,
      canonicalDecisionSnapshotId: decisionSnapshot.snapshot_id,
    });

    return context;
  } catch (error) {
    if (!durable) database.restore(outerSnapshot);
    throw error;
  }
}

module.exports = {
  createVerifiedProcessingContext,
  resolveTransition,
};
