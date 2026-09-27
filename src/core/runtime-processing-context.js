'use strict';

const {
  createCanonicalDecisionInput,
  reconstructSnapshot,
  findBranchCommonAncestor,
} = require('./canonical-decision-input');
const {
  acceptCanonicalLineage,
  reconstructLineage,
  deriveLineageId,
} = require('./runtime-canonical-lineage');
const { readProcessingResult } = require('./processing-result-persistence');

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

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function queryLineages(database, fromBlock, toBlock) {
  const rows = database.db.exec(
    'SELECT lineage_id FROM canonical_lineage WHERE from_block <= ? AND to_block >= ? ORDER BY from_block, to_block, lineage_id',
    [toBlock, Math.max(0, fromBlock - 1)]
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

function queryExactLineages(database, fromBlock, toBlock) {
  const rows = database.db.exec(
    'SELECT lineage_id FROM canonical_lineage WHERE from_block = ? AND to_block = ? ORDER BY lineage_id',
    [fromBlock, toBlock]
  );
  return rows.length ? rows[0].values.map(row => row[0]) : [];
}

function queryExactProcessingResults(database, fromBlock, toBlock) {
  const rows = database.db.exec(
    'SELECT result_id FROM processing_results WHERE from_block = ? AND to_block = ? AND status = ? AND canonicality_status = ? ORDER BY result_id',
    [fromBlock, toBlock, 'ACCEPTED', 'CANONICAL']
  );
  return rows.length ? rows[0].values.map(row => row[0]) : [];
}

function verifyProcessingResultTransition(database, processingResult) {
  if (processingResult.transitionType === 'INITIAL') {
    if (processingResult.parentResultId !== null) fail('PROCESSING_CONTEXT_RECOVERY_INITIAL_PARENT_INVALID');
    if (processingResult.generation !== '1') fail('PROCESSING_CONTEXT_RECOVERY_INITIAL_GENERATION_INVALID');
    return;
  }
  if (typeof processingResult.parentResultId !== 'string' || processingResult.parentResultId.length === 0) {
    fail('PROCESSING_CONTEXT_RECOVERY_PARENT_MISSING');
  }
  const parent = readProcessingResult(database, processingResult.parentResultId);
  if (processingResult.transitionType === 'CONTINUATION') {
    if (processingResult.generation !== parent.generation) {
      fail('PROCESSING_CONTEXT_RECOVERY_CONTINUATION_GENERATION_MISMATCH');
    }
    return;
  }
  if (processingResult.transitionType === 'REORG_REPLACEMENT' &&
      processingResult.generation === parent.generation) {
    fail('PROCESSING_CONTEXT_RECOVERY_REORG_GENERATION_INVALID');
  }
}

function snapshotForProcessingResult(database, processingResult) {
  const snapshotId = processingResult.provenance &&
    processingResult.provenance.canonical_decision_snapshot_id;
  if (typeof snapshotId !== 'string' || snapshotId.length === 0) {
    fail('PROCESSING_CONTEXT_RECOVERY_SNAPSHOT_MISSING');
  }
  const snapshot = reconstructSnapshot(database.db, snapshotId);
  if (snapshot.from_block !== processingResult.fromBlock ||
      snapshot.to_block !== processingResult.toBlock) {
    fail('PROCESSING_CONTEXT_RECOVERY_SNAPSHOT_RANGE_MISMATCH');
  }
  return snapshot;
}

async function verifyProviderAgainstSnapshot({ provider, chainId, snapshot }) {
  if (!provider || typeof provider.getNetwork !== 'function' || typeof provider.getBlock !== 'function') {
    fail('PROCESSING_CONTEXT_RECOVERY_PROVIDER_REQUIRED');
  }
  let network;
  try {
    network = await provider.getNetwork();
  } catch (error) {
    const wrapped = new Error('PROCESSING_CONTEXT_RECOVERY_PROVIDER_UNAVAILABLE');
    wrapped.code = wrapped.message;
    wrapped.cause = error;
    throw wrapped;
  }
  const actualChainId = Number(network && network.chainId);
  if (!Number.isSafeInteger(actualChainId) || actualChainId !== chainId) {
    fail('PROCESSING_CONTEXT_RECOVERY_CHAIN_MISMATCH');
  }
  for (const stored of snapshot.records) {
    let header;
    try {
      header = await provider.getBlock(stored.block_number);
    } catch (error) {
      const wrapped = new Error('PROCESSING_CONTEXT_RECOVERY_PROVIDER_UNAVAILABLE');
      wrapped.code = wrapped.message;
      wrapped.cause = error;
      throw wrapped;
    }
    if (!header || header.number !== stored.block_number ||
        header.hash !== stored.block_hash ||
        header.parentHash !== stored.parent_block_hash) {
      return false;
    }
  }
  return true;
}

function contextFromRecoveredLineage(database, lineage, snapshot) {
  const processingResult = readProcessingResult(database, lineage.processingResultId);
  return Object.freeze({
    status: 'VERIFIED',
    fromBlock: lineage.fromBlock,
    toBlock: lineage.toBlock,
    processingResultId: lineage.processingResultId,
    processingExecutionId: processingResult.processingExecutionId,
    parentResultId: lineage.parentResultId,
    transitionType: lineage.transitionType,
    generation: lineage.generation,
    canonicalEvidenceIds: Object.freeze([...lineage.canonicalEvidenceIds]),
    emptyResult: lineage.canonicalEvidenceIds.length === 0,
    evidenceSetDigest: lineage.canonicalEvidenceSetDigest,
    lineageId: lineage.lineageId,
    provenance: deepFreeze({
      ...lineage.provenance,
      canonical_decision_snapshot_id: snapshot.snapshot_id,
    }),
    committedAt: lineage.committedAt,
    canonicalDecisionSnapshotId: snapshot.snapshot_id,
  });
}

async function recoverDurableContextFromProcessingResult({
  database,
  provider,
  writerFence,
  fromBlock,
  toBlock,
  chainId,
  transitionType,
}) {
  const resultIds = queryExactProcessingResults(database, fromBlock, toBlock);
  if (resultIds.length === 0) return null;
  if (resultIds.length > 1) fail('PROCESSING_CONTEXT_DURABLE_RESULT_CONFLICT');

  const processingResult = readProcessingResult(database, resultIds[0]);
  if (processingResult.fromBlock !== fromBlock || processingResult.toBlock !== toBlock) {
    fail('PROCESSING_CONTEXT_RECOVERY_RESULT_RANGE_MISMATCH');
  }
  if (transitionType && transitionType !== processingResult.transitionType) {
    fail('PROCESSING_CONTEXT_RECOVERY_TRANSITION_MISMATCH');
  }
  verifyProcessingResultTransition(database, processingResult);

  const snapshot = snapshotForProcessingResult(database, processingResult);
  if (snapshot.chain_id !== chainId) fail('PROCESSING_CONTEXT_RECOVERY_CHAIN_MISMATCH');

  const sameCanonical = await verifyProviderAgainstSnapshot({
    provider,
    chainId,
    snapshot,
  });
  if (!sameCanonical) return null;

  assertWriter(writerFence);

  const lineageId = deriveLineageId({
    transitionType: processingResult.transitionType,
    parentResultId: processingResult.parentResultId,
    fromBlock: processingResult.fromBlock,
    toBlock: processingResult.toBlock,
    generation: processingResult.generation,
    processingResultId: processingResult.processingResultId,
  });

  const existingForResult = database.db.exec(
    'SELECT lineage_id FROM canonical_lineage WHERE processing_result_id = ? ORDER BY lineage_id',
    [processingResult.processingResultId]
  );
  if (existingForResult.length && existingForResult[0].values.length > 0) {
    if (existingForResult[0].values.length !== 1 ||
        existingForResult[0].values[0][0] !== lineageId) {
      fail('PROCESSING_CONTEXT_RECOVERY_LINEAGE_CONFLICT');
    }
    return contextFromRecoveredLineage(database, reconstructLineage(database, lineageId), snapshot);
  }

  const exactLineage = database.db.exec(
    'SELECT lineage_id FROM canonical_lineage WHERE lineage_id = ?',
    [lineageId]
  );
  if (exactLineage.length && exactLineage[0].values.length > 0) {
    fail('PROCESSING_CONTEXT_RECOVERY_LINEAGE_CONFLICT');
  }

  const databaseSnapshot = database.snapshot();
  let committed = false;
  try {
    assertWriter(writerFence);
    database.db.run(
      'INSERT INTO canonical_lineage (lineage_id, from_block, to_block, processing_result_id, parent_result_id, transition_type, generation, canonical_evidence_set_digest, provenance_json, committed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        lineageId,
        processingResult.fromBlock,
        processingResult.toBlock,
        processingResult.processingResultId,
        processingResult.parentResultId,
        processingResult.transitionType,
        processingResult.generation,
        processingResult.evidenceSetDigest,
        require('../reference/v4/jcs').canonicalUtf8(processingResult.provenance).toString('utf8'),
        processingResult.committedAt,
      ]
    );
    assertWriter(writerFence);
    database.save();
    committed = true;
  } catch (error) {
    if (!committed) database.restore(databaseSnapshot);
    throw error;
  }

  return contextFromRecoveredLineage(database, reconstructLineage(database, lineageId), snapshot);
}

async function recoverDurableExactContext({
  database,
  provider,
  writerFence,
  fromBlock,
  toBlock,
  chainId,
  transitionType,
}) {
  assertWriter(writerFence);

  const lineageIds = queryExactLineages(database, fromBlock, toBlock);
  if (lineageIds.length === 0) {
    return recoverDurableContextFromProcessingResult({
      database,
      provider,
      writerFence,
      fromBlock,
      toBlock,
      chainId,
      transitionType,
    });
  }
  if (lineageIds.length > 1) fail('PROCESSING_CONTEXT_DURABLE_LINEAGE_CONFLICT');

  const lineage = reconstructLineage(database, lineageIds[0]);
  if (!lineage || lineage.status !== 'VERIFIED') {
    fail('PROCESSING_CONTEXT_DURABLE_LINEAGE_INVALID');
  }

  if (transitionType && transitionType !== lineage.transitionType) {
    fail('PROCESSING_CONTEXT_RECOVERY_TRANSITION_MISMATCH');
  }

  const snapshot = snapshotForLineage(database, lineage);

  if (!provider || typeof provider.getNetwork !== 'function' || typeof provider.getBlock !== 'function') {
    fail('PROCESSING_CONTEXT_RECOVERY_PROVIDER_REQUIRED');
  }

  let network;
  try {
    network = await provider.getNetwork();
  } catch (error) {
    const wrapped = new Error('PROCESSING_CONTEXT_RECOVERY_PROVIDER_UNAVAILABLE');
    wrapped.code = wrapped.message;
    wrapped.cause = error;
    throw wrapped;
  }

  const actualChainId = Number(network && network.chainId);
  if (!Number.isSafeInteger(actualChainId) || actualChainId !== chainId) {
    fail('PROCESSING_CONTEXT_RECOVERY_CHAIN_MISMATCH');
  }

  for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber += 1) {
    const stored = snapshot.records.find(record => record.block_number === blockNumber);
    if (!stored) fail('PROCESSING_CONTEXT_RECOVERY_SNAPSHOT_RANGE_INVALID');

    let header;
    try {
      header = await provider.getBlock(blockNumber);
    } catch (error) {
      const wrapped = new Error('PROCESSING_CONTEXT_RECOVERY_PROVIDER_UNAVAILABLE');
      wrapped.code = wrapped.message;
      wrapped.cause = error;
      throw wrapped;
    }

    if (!header || header.number !== blockNumber ||
        header.hash !== stored.block_hash ||
        header.parentHash !== stored.parent_block_hash) {
      return null;
    }
  }

  const processingResult = require('./processing-result-persistence')
    .readProcessingResult(database, lineage.processingResultId);

  assertWriter(writerFence);

  return Object.freeze({
    status: 'VERIFIED',
    fromBlock,
    toBlock,
    processingResultId: lineage.processingResultId,
    processingExecutionId: processingResult.processingExecutionId,
    parentResultId: lineage.parentResultId,
    transitionType: lineage.transitionType,
    generation: lineage.generation,
    canonicalEvidenceIds: Object.freeze([...lineage.canonicalEvidenceIds]),
    emptyResult: lineage.canonicalEvidenceIds.length === 0,
    evidenceSetDigest: lineage.canonicalEvidenceSetDigest,
    lineageId: lineage.lineageId,
    provenance: deepFreeze({
      ...lineage.provenance,
      canonical_decision_snapshot_id: snapshot.snapshot_id,
    }),
    committedAt: lineage.committedAt,
    canonicalDecisionSnapshotId: snapshot.snapshot_id,
  });
}

function resolveTransition({ database, snapshot, fromBlock, toBlock, requestedTransitionType }) {
  if (requestedTransitionType && !['INITIAL', 'CONTINUATION', 'REORG_REPLACEMENT'].includes(requestedTransitionType)) {
    fail('PROCESSING_CONTEXT_TRANSITION_INVALID');
  }

  const candidates = queryLineages(database, fromBlock, toBlock)
    .map(id => reconstructLineage(database, id));

  const exact = candidates.filter(lineage =>
    lineage.fromBlock === fromBlock && lineage.toBlock === toBlock
  );
  if (exact.length > 1) fail('PROCESSING_CONTEXT_LINEAGE_CONFLICT');
  if (exact.length === 1) {
    const existingSnapshot = snapshotForLineage(database, exact[0]);
    const sameCanonical = Array.from(
      { length: toBlock - fromBlock + 1 },
      (_, index) => fromBlock + index
    ).every(block =>
      blockHash(existingSnapshot, block) === blockHash(snapshot, block)
    );
    if (sameCanonical) {
      return {
        transitionType: exact[0].transitionType,
        parentResultId: exact[0].parentResultId,
        generation: exact[0].generation,
      };
    }
  }

  if (candidates.length === 0) {
    if (requestedTransitionType === 'CONTINUATION' || requestedTransitionType === 'REORG_REPLACEMENT') {
      fail(requestedTransitionType === 'CONTINUATION'
        ? 'PROCESSING_CONTEXT_PARENT_MISSING'
        : 'PROCESSING_CONTEXT_REORG_PARENT_AMBIGUOUS');
    }
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
    const recovered = await recoverDurableExactContext({
      database,
      provider,
      writerFence,
      fromBlock,
      toBlock,
      chainId,
      transitionType,
    });

    if (recovered) {
      return recovered;
    }

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
      provenance: deepFreeze({
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
  recoverDurableExactContext,
};
