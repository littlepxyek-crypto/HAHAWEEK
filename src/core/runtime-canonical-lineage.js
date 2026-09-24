'use strict';

const crypto = require('node:crypto');
const { canonicalUtf8 } = require('../reference/v4/jcs');
const { createCanonicalEvidence } = require('./canonical-evidence');
const { createEvidenceRepository } = require('./evidence-repository');
const { readProcessingResult, persistProcessingResult } = require('./processing-result-persistence');
const { reconstructSnapshot } = require('./canonical-decision-input');
const { transitionHash, DOMAIN: TRANSITION_DOMAIN } = require('../v4/f02-reorg-verifier');

const STATES = new Set(['OBSERVED', 'CANONICAL', 'ORPHANED']);
const EDGES = new Set(['OBSERVED->CANONICAL', 'CANONICAL->ORPHANED']);
const SEQUENCE_RE = /^(0|[1-9][0-9]*)$/;
const HASH_RE = /^[0-9a-f]{64}$/;
const GENERATION_RE = /^(0|[1-9][0-9]*)$/;
const MAX_UINT64 = 18446744073709551615n;
const TRANSITION_ID_RE = /^tr:v1:[0-9a-f]{64}$/;
const RESULT_ID_RE = /^pr:v1:[0-9a-f]{64}$/;
const EXECUTION_ID_RE = /^px:v1:[0-9a-f]{64}$/;
const RESULT_ID_DOMAIN = 'HAHAWEEK-RUNTIME-PROCESSING-RESULT-ID-V1';
const EXECUTION_ID_DOMAIN = 'HAHAWEEK-RUNTIME-PROCESSING-EXECUTION-ID-V1';
const LINEAGE_ID_DOMAIN = 'HAHAWEEK-RUNTIME-CANONICAL-LINEAGE-ID-V1';

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function assertString(value, code) {
  if (typeof value !== 'string' || value.length === 0) fail(code);
  return value;
}

function assertBlock(value, code) {
  if (!Number.isSafeInteger(value) || value < 0) fail(code);
  return value;
}

function assertGeneration(value) {
  assertString(value, 'RUNTIME_GENERATION_REQUIRED');
  if (!GENERATION_RE.test(value)) fail('RUNTIME_GENERATION_INVALID');
  if (BigInt(value) > MAX_UINT64) fail('RUNTIME_GENERATION_OVERFLOW');
  return value;
}

function assertHash(value, code = 'TRANSITION_HASH_INVALID') {
  if (typeof value !== 'string' || !HASH_RE.test(value)) fail(code);
}

function domainHash(domain, payload) {
  return crypto.createHash('sha256')
    .update(Buffer.from(domain + '\0', 'utf8'))
    .update(canonicalUtf8(payload))
    .digest('hex');
}

function transitionIdentityPayload({ evidenceId, fromState, toState, sequence, previousTransitionHash }) {
  return {
    evidence_id: evidenceId,
    from_state: fromState,
    previous_transition_hash: previousTransitionHash,
    sequence: String(sequence),
    to_state: toState,
  };
}

function createTransitionRecord({ evidenceId, fromState, toState, sequence, previousTransitionHash, provenance, committedAt }) {
  assertString(evidenceId, 'TRANSITION_EVIDENCE_ID_INVALID');
  if (!STATES.has(fromState) || !STATES.has(toState)) fail('TRANSITION_STATE_INVALID');
  if (!EDGES.has(fromState + '->' + toState)) fail('TRANSITION_EDGE_INVALID');
  if (!SEQUENCE_RE.test(String(sequence))) fail('TRANSITION_SEQUENCE_INVALID');
  if (previousTransitionHash !== null) assertHash(previousTransitionHash, 'TRANSITION_PREVIOUS_HASH_INVALID');
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) fail('TRANSITION_PROVENANCE_INVALID');
  assertString(committedAt, 'TRANSITION_COMMITTED_AT_INVALID');

  const transition = transitionIdentityPayload({
    evidenceId,
    fromState,
    toState,
    sequence,
    previousTransitionHash,
  });
  const hash = transitionHash(transition);
  return {
    transitionId: `tr:v1:${hash}`,
    evidenceId,
    fromState,
    toState,
    sequence: String(sequence),
    previousTransitionHash,
    transitionHash: hash,
    provenance,
    committedAt,
  };
}

function assertTransitionRecord(record) {
  if (!record || typeof record !== 'object') fail('TRANSITION_RECORD_INVALID');
  if (!TRANSITION_ID_RE.test(record.transitionId)) fail('TRANSITION_ID_INVALID');
  const expected = createTransitionRecord(record);
  if (expected.transitionId !== record.transitionId ||
      expected.transitionHash !== record.transitionHash ||
      expected.evidenceId !== record.evidenceId ||
      expected.fromState !== record.fromState ||
      expected.toState !== record.toState ||
      expected.sequence !== record.sequence ||
      expected.previousTransitionHash !== record.previousTransitionHash) {
    fail('TRANSITION_INTEGRITY_CONFLICT');
  }
  assertHash(record.transitionHash);
  return record;
}

function readTransitions(database, evidenceId) {
  const rows = database.db.exec(
    'SELECT transition_id, evidence_id, from_state, to_state, sequence, previous_transition_hash, transition_hash, provenance_json, committed_at FROM canonical_transitions WHERE evidence_id = ? ORDER BY CAST(sequence AS INTEGER) ASC',
    [evidenceId]
  );
  const records = (rows.length ? rows[0].values : []).map(row => ({
    transitionId: row[0],
    evidenceId: row[1],
    fromState: row[2],
    toState: row[3],
    sequence: row[4],
    previousTransitionHash: row[5],
    transitionHash: row[6],
    provenance: JSON.parse(row[7]),
    committedAt: row[8],
  }));
  let previous = null;
  for (const record of records) {
    assertTransitionRecord(record);
    if (previous === null) {
      if (record.sequence !== '0' || record.previousTransitionHash !== null) {
        fail('TRANSITION_GENESIS_INVALID');
      }
    } else {
      if (record.previousTransitionHash !== previous.transitionHash) fail('TRANSITION_PREDECESSOR_MISMATCH');
      if (BigInt(record.sequence) !== BigInt(previous.sequence) + 1n) fail('TRANSITION_SEQUENCE_GAP');
    }
    previous = record;
  }
  return records;
}

function latestState(database, evidenceId) {
  const history = readTransitions(database, evidenceId);
  if (!history.length) return null;
  return history[history.length - 1].toState;
}

function appendTransition(database, input) {
  const history = readTransitions(database, input.evidenceId);
  const previous = history.length ? history[history.length - 1] : null;
  const expectedFrom = previous ? previous.toState : null;
  if (previous && expectedFrom !== input.fromState) fail('TRANSITION_STATE_PREDECESSOR_MISMATCH');
  if (!previous && input.fromState !== 'OBSERVED') fail('TRANSITION_GENESIS_STATE_INVALID');

  const sequence = previous ? String(BigInt(previous.sequence) + 1n) : '0';
  const record = createTransitionRecord({
    ...input,
    sequence,
    previousTransitionHash: previous ? previous.transitionHash : null,
  });

  const existing = database.db.exec(
    'SELECT transition_id, evidence_id, from_state, to_state, sequence, previous_transition_hash, transition_hash, provenance_json, committed_at FROM canonical_transitions WHERE transition_id = ?',
    [record.transitionId]
  );
  if (existing.length && existing[0].values.length) {
    const row = existing[0].values[0];
    const same = row[1] === record.evidenceId &&
      row[2] === record.fromState &&
      row[3] === record.toState &&
      row[4] === record.sequence &&
      row[5] === record.previousTransitionHash &&
      row[6] === record.transitionHash &&
      row[7] === canonicalUtf8(record.provenance).toString('utf8') &&
      row[8] === record.committedAt;
    if (!same) fail('TRANSITION_INTEGRITY_CONFLICT');
    return record;
  }

  const sameSequence = database.db.exec(
    'SELECT transition_hash FROM canonical_transitions WHERE evidence_id = ? AND sequence = ?',
    [record.evidenceId, record.sequence]
  );
  if (sameSequence.length && sameSequence[0].values.length) fail('TRANSITION_SEQUENCE_CONFLICT');

  database.db.run(
    'INSERT INTO canonical_transitions (transition_id, evidence_id, from_state, to_state, sequence, previous_transition_hash, transition_hash, provenance_json, committed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      record.transitionId,
      record.evidenceId,
      record.fromState,
      record.toState,
      record.sequence,
      record.previousTransitionHash,
      record.transitionHash,
      canonicalUtf8(record.provenance).toString('utf8'),
      record.committedAt,
    ]
  );
  return record;
}

function reconstructLineage(database, lineageId) {
  const rows = database.db.exec(
    'SELECT lineage_id, from_block, to_block, processing_result_id, parent_result_id, transition_type, generation, canonical_evidence_set_digest, provenance_json, committed_at FROM canonical_lineage WHERE lineage_id = ?',
    [lineageId]
  );
  if (!rows.length || rows[0].values.length !== 1) fail('LINEAGE_NOT_FOUND');
  const row = rows[0].values[0];
  const lineage = {
    lineageId: row[0],
    fromBlock: row[1],
    toBlock: row[2],
    processingResultId: row[3],
    parentResultId: row[4],
    transitionType: row[5],
    generation: row[6],
    canonicalEvidenceSetDigest: row[7],
    provenance: JSON.parse(row[8]),
    committedAt: row[9],
  };
  const result = readProcessingResult(database, lineage.processingResultId);
  if (result.fromBlock !== lineage.fromBlock ||
      result.toBlock !== lineage.toBlock ||
      result.parentResultId !== lineage.parentResultId ||
      result.transitionType !== lineage.transitionType ||
      result.generation !== lineage.generation ||
      result.evidenceSetDigest !== lineage.canonicalEvidenceSetDigest) {
    fail('LINEAGE_PROCESSING_RESULT_MISMATCH');
  }
  return { status: 'VERIFIED', ...lineage, canonicalEvidenceIds: result.canonicalEvidenceIds };
}

function validateTransitionType({ database, transitionType, parentResultId, generation }) {
  if (!['INITIAL', 'CONTINUATION', 'REORG_REPLACEMENT'].includes(transitionType)) {
    fail('RUNTIME_TRANSITION_TYPE_INVALID');
  }
  if (transitionType === 'INITIAL') {
    if (parentResultId !== null && parentResultId !== undefined) fail('RUNTIME_INITIAL_PARENT_FORBIDDEN');
    return { parent: null, generation: assertGeneration(generation) };
  }

  assertString(parentResultId, 'RUNTIME_PARENT_REQUIRED');
  const parent = readProcessingResult(database, parentResultId);
  if (transitionType === 'CONTINUATION') {
    if (generation !== undefined && generation !== parent.generation) fail('RUNTIME_CONTINUATION_GENERATION_MISMATCH');
    return { parent, generation: parent.generation };
  }

  const nextGeneration = assertGeneration(generation);
  if (nextGeneration === parent.generation) fail('RUNTIME_REORG_GENERATION_MUST_CHANGE');
  return { parent, generation: nextGeneration };
}

function deriveResultId({ transitionType, parentResultId, fromBlock, toBlock, generation, canonicalEvidenceIds }) {
  const payload = {
    canonical_evidence_ids: canonicalEvidenceIds.slice(),
    contract: RESULT_ID_DOMAIN,
    from_block: String(fromBlock),
    generation,
    parent_result_id: parentResultId ?? null,
    to_block: String(toBlock),
    transition_type: transitionType,
  };
  return `pr:v1:${domainHash(RESULT_ID_DOMAIN, payload)}`;
}

function deriveExecutionId({ transitionType, parentResultId, fromBlock, toBlock, generation, canonicalEvidenceIds }) {
  const payload = {
    canonical_evidence_ids: canonicalEvidenceIds.slice(),
    contract: EXECUTION_ID_DOMAIN,
    from_block: String(fromBlock),
    generation,
    parent_result_id: parentResultId ?? null,
    to_block: String(toBlock),
    transition_type: transitionType,
  };
  return `px:v1:${domainHash(EXECUTION_ID_DOMAIN, payload)}`;
}

function deriveLineageId({ transitionType, parentResultId, fromBlock, toBlock, generation, processingResultId }) {
  const payload = {
    contract: LINEAGE_ID_DOMAIN,
    from_block: String(fromBlock),
    generation,
    parent_result_id: parentResultId ?? null,
    processing_result_id: processingResultId,
    to_block: String(toBlock),
    transition_type: transitionType,
  };
  return `cl:v1:${domainHash(LINEAGE_ID_DOMAIN, payload)}`;
}

function rawFromRow(row) {
  return {
    event_id: row.event_id,
    chain_id: row.chain_id,
    block_number: row.block_number,
    transaction_hash: row.transaction_hash,
    block_hash: row.block_hash,
    transaction_index: row.transaction_index,
    log_index: row.log_index,
    address: row.address,
    topics: JSON.parse(row.topics_json),
    data: row.data,
    captured_at: row.captured_at,
  };
}

function readRawEvents(database, fromBlock, toBlock) {
  const rows = database.db.exec(
    'SELECT event_id, chain_id, block_number, transaction_hash, block_hash, transaction_index, log_index, address, topics_json, data, captured_at FROM raw_events WHERE block_number >= ? AND block_number <= ? ORDER BY block_number, transaction_index, log_index, event_id',
    [fromBlock, toBlock]
  );
  if (!rows.length) return [];
  return rows[0].values.map(row => rawFromRow({
    event_id: row[0], chain_id: row[1], block_number: row[2], transaction_hash: row[3],
    block_hash: row[4], transaction_index: row[5], log_index: row[6], address: row[7],
    topics_json: row[8], data: row[9], captured_at: row[10],
  }));
}

function snapshotBlockMap(snapshot) {
  return new Map(snapshot.records.map(record => [record.block_number, record.block_hash]));
}

function collectEvidenceIds(database, fromBlock, toBlock) {
  const rows = database.db.exec(
    'SELECT evidence_id FROM canonical_evidence WHERE json_extract(canonical_json, \'$.location.block_number\') >= ? AND json_extract(canonical_json, \'$.location.block_number\') <= ? ORDER BY evidence_id',
    [fromBlock, toBlock]
  );
  return rows.length ? rows[0].values.map(row => row[0]) : [];
}

function verifyEvidence(database, evidenceRepository, evidenceId) {
  const result = evidenceRepository.verify(evidenceId);
  if (!result.verified) fail('CANONICAL_EVIDENCE_' + result.reason);
  const record = evidenceRepository.get(evidenceId);
  const location = record.canonical.location;
  if (location.block_hash == null || location.transaction_index == null) fail('CANONICAL_EVIDENCE_IDENTITY_INCOMPLETE');
  return record;
}

function canonicalEvidenceForRange({ database, evidenceRepository, snapshot, fromBlock, toBlock, committedAt, provenance }) {
  const blockHashes = snapshotBlockMap(snapshot);
  const rawEvents = readRawEvents(database, fromBlock, toBlock);
  const observedEvidence = new Set();

  for (const raw of rawEvents) {
    if (raw.block_hash == null || raw.transaction_index == null) fail('CANONICAL_EVIDENCE_IDENTITY_INCOMPLETE');
    const canonical = createCanonicalEvidence(raw);
    if (canonical.identity_status !== 'COMPLETE') fail('CANONICAL_EVIDENCE_IDENTITY_INCOMPLETE');
    evidenceRepository.insert(raw, canonical);
    observedEvidence.add(canonical.evidence_id);
  }

  // The frozen F-02 edge set does not permit OBSERVED->ORPHANED.
  // New non-canonical observations therefore remain OBSERVED and are excluded.
  const allEvidenceIds = new Set([
    ...observedEvidence,
    ...collectEvidenceIds(database, fromBlock, toBlock),
  ]);

  const canonicalIds = [];
  for (const evidenceId of [...allEvidenceIds].sort()) {
    const record = verifyEvidence(database, evidenceRepository, evidenceId);
    const location = record.canonical.location;
    const acceptedHash = blockHashes.get(location.block_number);
    if (acceptedHash === undefined) fail('CANONICAL_DECISION_BLOCK_MISSING');
    const state = latestState(database, evidenceId);
    if (location.block_hash === acceptedHash) {
      if (state === null) {
        appendTransition(database, {
          evidenceId,
          fromState: 'OBSERVED',
          toState: 'CANONICAL',
          provenance: { ...provenance, evidence_id: evidenceId, block_id: String(record.canonical.chain_id) + ':' + String(location.block_number) + ':' + String(location.block_hash) },
          committedAt,
        });
      } else if (state !== 'CANONICAL') {
        fail('CANONICAL_STATE_INVALID');
      }
      canonicalIds.push(evidenceId);
    } else if (state === 'CANONICAL') {
      appendTransition(database, {
        evidenceId,
        fromState: 'CANONICAL',
        toState: 'ORPHANED',
        provenance: { ...provenance, evidence_id: evidenceId, block_id: `${record.canonical.chain_id}:${location.block_number}:${location.block_hash}` },
        committedAt,
      });
    } else if (state !== null && state !== 'ORPHANED') {
      fail('CANONICAL_STATE_INVALID');
    }
  }

  return canonicalIds.sort();
}

async function acceptCanonicalLineage({
  database,
  writerFence,
  canonicalDecisionSnapshot,
  canonicalDecisionSnapshotId,
  fromBlock,
  toBlock,
  transitionType,
  parentResultId = null,
  generation,
  provenance = {},
  committedAt = new Date().toISOString(),
}) {
  if (!database || !database.db || typeof database.save !== 'function' || typeof database.snapshot !== 'function' || typeof database.restore !== 'function') fail('RUNTIME_DATABASE_REQUIRED');
  if (!writerFence || typeof writerFence.assertOwned !== 'function') fail('RUNTIME_WRITER_FENCE_REQUIRED');
  assertBlock(fromBlock, 'RUNTIME_FROM_BLOCK_INVALID');
  assertBlock(toBlock, 'RUNTIME_TO_BLOCK_INVALID');
  if (fromBlock > toBlock) fail('RUNTIME_RANGE_INVALID');
  assertString(committedAt, 'RUNTIME_COMMITTED_AT_INVALID');
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) fail('RUNTIME_PROVENANCE_INVALID');

  writerFence.assertOwned();

  const snapshot = canonicalDecisionSnapshot ||
    (canonicalDecisionSnapshotId ? reconstructSnapshot(database.db, canonicalDecisionSnapshotId) : null);
  if (!snapshot) fail('CANONICAL_DECISION_SNAPSHOT_REQUIRED');
  if (snapshot.from_block !== fromBlock || snapshot.to_block !== toBlock) fail('CANONICAL_DECISION_RANGE_MISMATCH');

  const lineageInput = validateTransitionType({ database, transitionType, parentResultId, generation });
  const resolvedGeneration = lineageInput.generation;

  const databaseSnapshot = database.snapshot();
  let committed = false;
  try {
    const evidenceRepository = createEvidenceRepository(database.db);
    writerFence.assertOwned();
    const canonicalEvidenceIds = canonicalEvidenceForRange({
      database,
      evidenceRepository,
      snapshot,
      fromBlock,
      toBlock,
      committedAt,
      provenance,
    });

    const emptyResult = canonicalEvidenceIds.length === 0;
    const processingResultId = deriveResultId({
      transitionType,
      parentResultId: parentResultId ?? null,
      fromBlock,
      toBlock,
      generation: resolvedGeneration,
      canonicalEvidenceIds,
    });
    const processingExecutionId = deriveExecutionId({
      transitionType,
      parentResultId: parentResultId ?? null,
      fromBlock,
      toBlock,
      generation: resolvedGeneration,
      canonicalEvidenceIds,
    });

    const processingResult = {
      resultId: processingResultId,
      processingExecutionId,
      parentResultId: parentResultId ?? null,
      transitionType,
      fromBlock,
      toBlock,
      generation: resolvedGeneration,
      status: 'ACCEPTED',
      canonicalityStatus: 'CANONICAL',
      canonicalEvidenceIds,
      emptyResult,
      provenance: { ...provenance, canonical_decision_snapshot_id: snapshot.snapshot_id },
      committedAt,
    };

    const lineageId = deriveLineageId({
      transitionType,
      parentResultId: parentResultId ?? null,
      fromBlock,
      toBlock,
      generation: resolvedGeneration,
      processingResultId,
    });
    const existingLineage = database.db.exec(
      'SELECT lineage_id FROM canonical_lineage WHERE lineage_id = ?',
      [lineageId]
    );
    if (existingLineage.length && existingLineage[0].values.length === 1) {
      writerFence.assertOwned();
      return reconstructLineage(database, lineageId);
    }

    writerFence.assertOwned();
    const verifiedResult = persistProcessingResult({
      database,
      processingResult,
      writerFence,
    });

    const lineageProvenanceJson = canonicalUtf8(processingResult.provenance).toString('utf8');

    writerFence.assertOwned();
    database.db.run(
      'INSERT INTO canonical_lineage (lineage_id, from_block, to_block, processing_result_id, parent_result_id, transition_type, generation, canonical_evidence_set_digest, provenance_json, committed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        lineageId,
        fromBlock,
        toBlock,
        processingResultId,
        parentResultId ?? null,
        transitionType,
        resolvedGeneration,
        verifiedResult.evidenceSetDigest,
        lineageProvenanceJson,
        committedAt,
      ]
    );

    writerFence.assertOwned();
    database.save();
    committed = true;

    return reconstructLineage(database, lineageId);
  } catch (error) {
    if (!committed) database.restore(databaseSnapshot);
    throw error;
  }
}

module.exports = {
  TRANSITION_DOMAIN,
  RESULT_ID_DOMAIN,
  EXECUTION_ID_DOMAIN,
  LINEAGE_ID_DOMAIN,
  createTransitionRecord,
  assertTransitionRecord,
  readTransitions,
  latestState,
  appendTransition,
  deriveResultId,
  deriveExecutionId,
  deriveLineageId,
  reconstructLineage,
  acceptCanonicalLineage,
};
