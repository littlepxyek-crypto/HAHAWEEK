'use strict';

const { createEvidenceRepository } = require('./evidence-repository');
const { readProcessingResult } = require('./processing-result-persistence');
const { deriveV4EvidenceCommitment } = require('./v4-evidence-commitment');
const {
  commitF03AuthorityChain,
  readF03AuthorityChain,
} = require('./f03-authoritative-chain-persistence');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function assertExactContext(processingContext, fromBlock, toBlock) {
  if (!processingContext || typeof processingContext !== 'object') fail('F03_ESTABLISHMENT_PROCESSING_CONTEXT_REQUIRED');
  if (processingContext.status !== 'VERIFIED') fail('F03_ESTABLISHMENT_PROCESSING_CONTEXT_NOT_VERIFIED');
  if (processingContext.fromBlock !== fromBlock || processingContext.toBlock !== toBlock) {
    fail('F03_ESTABLISHMENT_RANGE_MISMATCH');
  }
  if (typeof processingContext.processingResultId !== 'string' || processingContext.processingResultId === '') {
    fail('F03_ESTABLISHMENT_PROCESSING_RESULT_ID_REQUIRED');
  }
  if (typeof processingContext.generation !== 'string' || processingContext.generation === '') {
    fail('F03_ESTABLISHMENT_GENERATION_REQUIRED');
  }
}

function buildProvenance({ processingContext, processingResult }) {
  return {
    sourceType: 'VERIFIED_PROCESSING_CONTEXT',
    processingResultId: processingResult.processingResultId,
    processingExecutionId: processingResult.processingExecutionId,
    lineageId: processingContext.lineageId,
    canonicalDecisionSnapshotId: processingContext.canonicalDecisionSnapshotId,
    evidenceSetDigest: processingResult.evidenceSetDigest,
    fromBlock: processingResult.fromBlock,
    toBlock: processingResult.toBlock,
    generation: processingResult.generation,
    transitionType: processingResult.transitionType,
    committedAt: processingResult.committedAt,
  };
}

function createF03ExpectedAuthorityEstablisher({ database, writerFence }) {
  if (!database || !database.db) fail('F03_ESTABLISHMENT_DATABASE_REQUIRED');
  if (!writerFence || typeof writerFence.assertOwned !== 'function') {
    fail('F03_ESTABLISHMENT_WRITER_FENCE_REQUIRED');
  }

  const evidenceRepository = createEvidenceRepository(database.db);

  function completeEvidenceRecord(evidenceId) {
    const record = evidenceRepository.get(evidenceId);
    if (!record) fail('F03_ESTABLISHMENT_CANONICAL_EVIDENCE_NOT_FOUND');
    const rawRows = database.db.exec(
      'SELECT event_id, chain_id, block_number, transaction_hash, block_hash, transaction_index, log_index, address, topics_json, data, captured_at FROM raw_events WHERE event_id = ?',
      [record.raw_event_id]
    );
    if (!rawRows.length || rawRows[0].values.length !== 1) fail('F03_ESTABLISHMENT_RAW_EVIDENCE_NOT_FOUND');
    const row = rawRows[0].values[0];
    return {
      ...record,
      raw: {
        event_id: row[0], chain_id: row[1], block_number: row[2], transaction_hash: row[3],
        block_hash: row[4], transaction_index: row[5], log_index: row[6], address: row[7],
        topics: JSON.parse(row[8]), data: row[9], captured_at: row[10],
      },
    };
  }

  return ({ fromBlock, toBlock, processingContext }) => {
    assertExactContext(processingContext, fromBlock, toBlock);
    writerFence.assertOwned();

    const processingResult = readProcessingResult(
      database,
      processingContext.processingResultId
    );

    if (
      processingResult.status !== 'VERIFIED' ||
      processingResult.fromBlock !== fromBlock ||
      processingResult.toBlock !== toBlock ||
      processingResult.generation !== processingContext.generation ||
      processingResult.evidenceSetDigest !== processingContext.evidenceSetDigest
    ) {
      fail('F03_ESTABLISHMENT_PROCESSING_RESULT_MISMATCH');
    }

    if (
      processingResult.canonicalityStatus !== 'CANONICAL' ||
      processingResult.statusContext !== 'ACCEPTED'
    ) {
      fail('F03_ESTABLISHMENT_PROCESSING_RESULT_NOT_CANONICAL');
    }

    const evidenceRecords = processingResult.canonicalEvidenceIds.map((evidenceId) => {
      const verification = evidenceRepository.verify(evidenceId);
      if (!verification.verified) {
        fail('F03_ESTABLISHMENT_CANONICAL_EVIDENCE_' + verification.reason);
      }
      return completeEvidenceRecord(evidenceId);
    });

    writerFence.assertOwned();

    const commitment = deriveV4EvidenceCommitment({
      processingResult: {
        processingResultId: processingResult.processingResultId,
        fromBlock: processingResult.fromBlock,
        toBlock: processingResult.toBlock,
        generation: processingResult.generation,
        status: 'ACCEPTED_CANONICAL',
        canonicalEvidenceIds: processingResult.canonicalEvidenceIds,
        emptyResult: processingResult.emptyResult,
      },
      evidenceRecords,
    });

    const provenance = buildProvenance({ processingContext, processingResult });

    const segment = {
      segmentId: commitment.segmentId,
      fromBlock: commitment.fromBlock,
      toBlock: commitment.toBlock,
      segmentDigest: commitment.segmentDigest,
      generation: commitment.generation,
      committedAt: processingResult.committedAt,
      provenance: {
        recordType: 'segment',
        recordId: commitment.segmentId,
        persistenceMechanism: 'sqlite',
        table: 'f03_segments',
        key: commitment.segmentId,
        artifactId: commitment.segmentId,
        generation: commitment.generation,
        integrityDigest: commitment.segmentDigest,
        committedAt: processingResult.committedAt,
        fromBlock: commitment.fromBlock,
        toBlock: commitment.toBlock,
        ...provenance,
      },
    };

    const manifest = {
      manifestId: commitment.manifestId,
      manifestDigest: commitment.manifestDigest,
      generation: commitment.generation,
      segmentId: commitment.segmentId,
      segmentDigest: commitment.segmentDigest,
      committedAt: processingResult.committedAt,
      provenance: {
        recordType: 'manifest',
        recordId: commitment.manifestId,
        persistenceMechanism: 'sqlite',
        table: 'f03_manifests',
        key: commitment.manifestId,
        artifactId: commitment.manifestId,
        upstreamRecordId: commitment.segmentId,
        generation: commitment.generation,
        integrityDigest: commitment.manifestDigest,
        committedAt: processingResult.committedAt,
        ...provenance,
      },
    };

    const checkpoint = {
      checkpointDigest: commitment.checkpointDigest,
      generation: commitment.generation,
      manifestId: commitment.manifestId,
      manifestDigest: commitment.manifestDigest,
      committedAt: processingResult.committedAt,
      provenance: {
        recordType: 'checkpoint',
        recordId: commitment.checkpointDigest,
        persistenceMechanism: 'sqlite',
        table: 'f03_checkpoints',
        key: commitment.checkpointDigest,
        artifactId: commitment.checkpointDigest,
        upstreamRecordId: commitment.manifestId,
        generation: commitment.generation,
        integrityDigest: commitment.checkpointDigest,
        committedAt: processingResult.committedAt,
        ...provenance,
      },
    };

    writerFence.assertOwned();

    let verified;
    try {
      verified = readF03AuthorityChain({ database, fromBlock, toBlock });
    } catch (error) {
      if (error && error.code !== 'F03_CHAIN_NOT_FOUND') throw error;
    }

    if (!verified) {
      commitF03AuthorityChain({
        database,
        writerFence,
        segment,
        manifest,
        checkpoint,
      });
      writerFence.assertOwned();
      verified = readF03AuthorityChain({ database, fromBlock, toBlock });
    }

    if (
      verified.generation !== processingContext.generation ||
      verified.segmentId !== commitment.segmentId ||
      verified.manifestDigest !== commitment.manifestDigest ||
      verified.checkpointDigest !== commitment.checkpointDigest ||
      verified.cursorBlock !== toBlock
    ) {
      fail('F03_ESTABLISHMENT_DURABLE_CHAIN_MISMATCH');
    }

    return verified;
  };
}

module.exports = { createF03ExpectedAuthorityEstablisher };
