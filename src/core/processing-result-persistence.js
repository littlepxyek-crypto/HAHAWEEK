'use strict';

const crypto = require('node:crypto');
const { canonicalUtf8 } = require('../reference/v4/jcs');
const {
  createEvidenceIdentity,
  hashRawEvidence,
  hashCanonicalEvidence,
} = require('./evidence-identity');
const { checkpointDigestFor } = require('./f03-authoritative-chain-persistence');

const DIGEST64 = /^[0-9a-f]{64}$/;
const GENERATION = /^(0|[1-9][0-9]*)$/;
const MAX_UINT64 = 18446744073709551615n;
const BLOCK_HASH = /^0x[0-9a-f]{64}$/;
const TX_HASH = /^0x[0-9a-f]{64}$/;
const RESULT_ID = /^.{1,}$/;
const DIGEST_DOMAIN = 'HAHAWEEK-EVIDENCE-V4-PROCESSING-RESULT-EVIDENCE-SET-V0.1';

function fail(code) {
  throw new Error(code);
}

function requireString(value, code) {
  if (typeof value !== 'string' || value.length === 0) fail(code);
  return value;
}

function assertBlock(value, code) {
  if (!Number.isSafeInteger(value) || value < 0) fail(code);
  return value;
}

function assertGeneration(value) {
  if (typeof value !== 'string' || !GENERATION.test(value)) fail('PROCESSING_RESULT_GENERATION_INVALID');
  if (BigInt(value) > MAX_UINT64) fail('PROCESSING_RESULT_GENERATION_OVERFLOW');
  return value;
}

function assertDigest(value, code) {
  if (typeof value !== 'string' || !DIGEST64.test(value)) fail(code);
  return value;
}

function assertTimestamp(value) {
  if (typeof value !== 'string' || value === '' || Number.isNaN(Date.parse(value))) {
    fail('PROCESSING_RESULT_COMMITTED_AT_INVALID');
  }
  return value;
}

function hashEvidenceSet(result, members) {
  const payload = {
    contract: DIGEST_DOMAIN,
    result_id: result.resultId,
    from_block: String(result.fromBlock),
    to_block: String(result.toBlock),
    generation: result.generation,
    members: members.map(member => ({
      ordinal: String(member.ordinal),
      evidence_id: member.evidence_id,
      raw_event_id: member.raw_event_id,
      identity_hash: member.identity_hash,
      raw_hash: member.raw_hash,
      canonical_hash: member.canonical_hash,
      block_number: String(member.block_number),
      transaction_index: String(member.transaction_index),
      log_index: String(member.log_index),
    })),
  };
  return crypto.createHash('sha256')
    .update(Buffer.from(DIGEST_DOMAIN + '\0', 'utf8'))
    .update(canonicalUtf8(payload))
    .digest('hex');
}

function authorityKey(member) {
  return [
    member.block_number,
    member.transaction_index,
    member.log_index,
    member.raw_event_id,
  ].join('|');
}

function parseJson(value, code) {
  try {
    return JSON.parse(value);
  } catch {
    fail(code);
  }
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
    topics: parseJson(row.topics_json, 'PROCESSING_RESULT_RAW_TOPICS_INVALID'),
    data: row.data,
    captured_at: row.captured_at,
  };
}

function loadEvidence(database, evidenceId) {
  const rows = database.db.exec(
    'SELECT evidence_id, identity_schema_version, identity_hash, raw_event_id, raw_hash, canonical_hash, canonical_json, interpretation_status FROM canonical_evidence WHERE evidence_id = ?',
    [evidenceId]
  );
  if (!rows.length || rows[0].values.length !== 1) fail('PROCESSING_RESULT_EVIDENCE_NOT_FOUND');

  const row = rows[0].values[0];
  const evidence = {
    evidence_id: row[0],
    identity_schema_version: row[1],
    identity_hash: row[2],
    raw_event_id: row[3],
    raw_hash: row[4],
    canonical_hash: row[5],
    canonical: parseJson(row[6], 'PROCESSING_RESULT_CANONICAL_JSON_INVALID'),
    interpretation_status: row[7],
  };

  const rawRows = database.db.exec(
    'SELECT event_id, chain_id, block_number, transaction_hash, block_hash, transaction_index, log_index, address, topics_json, data, captured_at FROM raw_events WHERE event_id = ?',
    [evidence.raw_event_id]
  );
  if (!rawRows.length || rawRows[0].values.length !== 1) fail('PROCESSING_RESULT_RAW_EVENT_NOT_FOUND');

  const rawColumns = ['event_id','chain_id','block_number','transaction_hash','block_hash','transaction_index','log_index','address','topics_json','data','captured_at'];
  const rawRow = rawRows[0].values[0].reduce((obj, value, index) => {
    obj[rawColumns[index]] = value;
    return obj;
  }, {});
  const raw = rawFromRow(rawRow);

  if (evidence.canonical.raw_reference?.event_id !== evidence.raw_event_id ||
      evidence.canonical.evidence_id !== evidence.evidence_id ||
      evidence.canonical.identity_status !== 'COMPLETE') {
    fail('PROCESSING_RESULT_EVIDENCE_IDENTITY_INVALID');
  }
  if (hashRawEvidence(raw) !== evidence.raw_hash) fail('PROCESSING_RESULT_RAW_HASH_MISMATCH');
  if (hashCanonicalEvidence(evidence.canonical) !== evidence.canonical_hash) {
    fail('PROCESSING_RESULT_CANONICAL_HASH_MISMATCH');
  }
  const identity = createEvidenceIdentity(evidence.canonical);
  if (identity.evidence_id !== evidence.evidence_id ||
      identity.identity_schema_version !== evidence.identity_schema_version ||
      identity.identity_hash !== evidence.identity_hash) {
    fail('PROCESSING_RESULT_EVIDENCE_IDENTITY_MISMATCH');
  }

  const location = evidence.canonical.location;
  if (!BLOCK_HASH.test(location.block_hash || '') || !TX_HASH.test(location.transaction_hash || '')) {
    fail('PROCESSING_RESULT_EVIDENCE_LOCATION_INVALID');
  }
  if (!Number.isSafeInteger(location.transaction_index) || location.transaction_index < 0) {
    fail('PROCESSING_RESULT_TRANSACTION_INDEX_INVALID');
  }
  if (!Number.isSafeInteger(location.log_index) || location.log_index < 0) {
    fail('PROCESSING_RESULT_LOG_INDEX_INVALID');
  }

  return {
    evidence_id: evidence.evidence_id,
    raw_event_id: evidence.raw_event_id,
    identity_hash: evidence.identity_hash,
    raw_hash: evidence.raw_hash,
    canonical_hash: evidence.canonical_hash,
    block_number: location.block_number,
    transaction_index: location.transaction_index,
    log_index: location.log_index,
  };
}

function validateResult(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('PROCESSING_RESULT_REQUIRED');
  requireString(input.resultId, 'PROCESSING_RESULT_ID_INVALID');
  requireString(input.processingExecutionId, 'PROCESSING_EXECUTION_ID_INVALID');
  assertBlock(input.fromBlock, 'PROCESSING_RESULT_FROM_BLOCK_INVALID');
  assertBlock(input.toBlock, 'PROCESSING_RESULT_TO_BLOCK_INVALID');
  if (input.fromBlock > input.toBlock) fail('PROCESSING_RESULT_RANGE_INVALID');
  assertGeneration(input.generation);
  if (input.status !== 'ACCEPTED') fail('PROCESSING_RESULT_STATUS_INVALID');
  if (input.canonicalityStatus !== 'CANONICAL') fail('PROCESSING_RESULT_CANONICALITY_INVALID');
  if (typeof input.emptyResult !== 'boolean') fail('PROCESSING_RESULT_EMPTY_DECLARATION_REQUIRED');
  if (!Array.isArray(input.canonicalEvidenceIds)) fail('PROCESSING_RESULT_EVIDENCE_IDS_INVALID');
  if (!RESULT_ID.test(input.resultId)) fail('PROCESSING_RESULT_ID_INVALID');
  if (!['INITIAL','CONTINUATION','REORG_REPLACEMENT'].includes(input.transitionType)) {
    fail('PROCESSING_RESULT_TRANSITION_INVALID');
  }
  if (input.transitionType === 'INITIAL' && input.parentResultId != null) {
    fail('PROCESSING_RESULT_INITIAL_PARENT_FORBIDDEN');
  }
  if (input.transitionType !== 'INITIAL' && typeof input.parentResultId !== 'string') {
    fail('PROCESSING_RESULT_PARENT_REQUIRED');
  }
  assertTimestamp(input.committedAt);
  if (typeof input.provenance !== 'object' || input.provenance === null || Array.isArray(input.provenance)) {
    fail('PROCESSING_RESULT_PROVENANCE_INVALID');
  }
  return input;
}

function rowObject(columns, row) {
  return columns.reduce((obj, key, index) => {
    obj[key] = row[index];
    return obj;
  }, {});
}

function sameResult(row, result, digest, provenanceJson) {
  return row.result_id === result.resultId &&
    row.processing_execution_id === result.processingExecutionId &&
    row.parent_result_id === (result.parentResultId ?? null) &&
    row.transition_type === result.transitionType &&
    row.from_block === result.fromBlock &&
    row.to_block === result.toBlock &&
    row.generation === result.generation &&
    row.status === result.status &&
    row.canonicality_status === result.canonicalityStatus &&
    row.empty_result === (result.emptyResult ? 1 : 0) &&
    row.evidence_set_digest === digest &&
    row.provenance_json === provenanceJson &&
    row.committed_at === result.committedAt;
}

function readProcessingResult(database, resultId) {
  requireString(resultId, 'PROCESSING_RESULT_ID_INVALID');
  const rows = database.db.exec(
    'SELECT result_id, processing_execution_id, parent_result_id, transition_type, from_block, to_block, generation, status, canonicality_status, empty_result, evidence_set_digest, provenance_json, committed_at FROM processing_results WHERE result_id = ?',
    [resultId]
  );
  if (!rows.length || rows[0].values.length !== 1) fail('PROCESSING_RESULT_NOT_FOUND');
  const result = rowObject(
    ['result_id','processing_execution_id','parent_result_id','transition_type','from_block','to_block','generation','status','canonicality_status','empty_result','evidence_set_digest','provenance_json','committed_at'],
    rows[0].values[0]
  );
  assertGeneration(result.generation);
  if (result.status !== 'ACCEPTED' || result.canonicality_status !== 'CANONICAL') fail('PROCESSING_RESULT_NOT_ACCEPTED');

  const membersRows = database.db.exec(
    'SELECT result_id, ordinal, evidence_id, raw_event_id, identity_hash, raw_hash, canonical_hash, block_number, transaction_index, log_index FROM processing_result_evidence WHERE result_id = ? ORDER BY ordinal',
    [resultId]
  );
  const members = (membersRows.length ? membersRows[0].values : []).map(row =>
    rowObject(['result_id','ordinal','evidence_id','raw_event_id','identity_hash','raw_hash','canonical_hash','block_number','transaction_index','log_index'], row)
  );

  if ((result.empty_result === 1) !== (members.length === 0)) fail('PROCESSING_RESULT_EMPTY_MEMBERSHIP_MISMATCH');
  for (let i = 0; i < members.length; i += 1) {
    if (members[i].ordinal !== i) fail('PROCESSING_RESULT_ORDINAL_INVALID');
    if (members[i].block_number < result.from_block || members[i].block_number > result.to_block) {
      fail('PROCESSING_RESULT_MEMBER_RANGE_INVALID');
    }
  }
  const digest = hashEvidenceSet({
    resultId: result.result_id,
    fromBlock: result.from_block,
    toBlock: result.to_block,
    generation: result.generation,
  }, members);
  if (digest !== result.evidence_set_digest) fail('PROCESSING_RESULT_EVIDENCE_SET_DIGEST_MISMATCH');

  return {
    status: 'VERIFIED',
    processingResultId: result.result_id,
    processingExecutionId: result.processing_execution_id,
    parentResultId: result.parent_result_id,
    transitionType: result.transition_type,
    fromBlock: result.from_block,
    toBlock: result.to_block,
    generation: result.generation,
    statusContext: result.status,
    canonicalityStatus: result.canonicality_status,
    emptyResult: result.empty_result === 1,
    evidenceSetDigest: result.evidence_set_digest,
    canonicalEvidenceIds: members.map(member => member.evidence_id),
    committedAt: result.committed_at,
    provenance: JSON.parse(result.provenance_json),
  };
}

function persistProcessingResult({ database, processingResult, writerFence }) {
  if (!database || !database.db || typeof database.save !== 'function' || typeof database.snapshot !== 'function' || typeof database.restore !== 'function') {
    fail('PROCESSING_RESULT_DATABASE_REQUIRED');
  }
  const result = validateResult(processingResult);
  if (!writerFence || typeof writerFence.assertOwned !== 'function') {
    fail('PROCESSING_RESULT_WRITER_FENCE_REQUIRED');
  }
  writerFence.assertOwned();

  const evidenceIds = new Set();
  for (const id of result.canonicalEvidenceIds) {
    requireString(id, 'PROCESSING_RESULT_EVIDENCE_ID_INVALID');
    if (evidenceIds.has(id)) fail('PROCESSING_RESULT_EVIDENCE_DUPLICATE');
    evidenceIds.add(id);
  }

  if (result.emptyResult !== (result.canonicalEvidenceIds.length === 0)) {
    fail('PROCESSING_RESULT_EMPTY_DECLARATION_MISMATCH');
  }

  const members = result.canonicalEvidenceIds.map(id => loadEvidence(database, id));
  const seenKeys = new Set();
  for (const member of members) {
    if (member.block_number < result.fromBlock || member.block_number > result.toBlock) {
      fail('PROCESSING_RESULT_MEMBER_RANGE_INVALID');
    }
    const key = authorityKey(member);
    if (seenKeys.has(key)) fail('PROCESSING_RESULT_AUTHORITY_KEY_DUPLICATE');
    seenKeys.add(key);
  }
  members.sort((a, b) =>
    a.block_number - b.block_number ||
    a.transaction_index - b.transaction_index ||
    a.log_index - b.log_index ||
    a.raw_event_id.localeCompare(b.raw_event_id) ||
    a.evidence_id.localeCompare(b.evidence_id)
  );
  const ordered = members.map((member, ordinal) => ({ ...member, ordinal }));
  const digest = hashEvidenceSet(result, ordered);
  const provenanceJson = canonicalUtf8(result.provenance).toString('utf8');

  const existing = database.db.exec(
    'SELECT result_id, processing_execution_id, parent_result_id, transition_type, from_block, to_block, generation, status, canonicality_status, empty_result, evidence_set_digest, provenance_json, committed_at FROM processing_results WHERE result_id = ?',
    [result.resultId]
  );
  if (existing.length && existing[0].values.length) {
    const row = rowObject(['result_id','processing_execution_id','parent_result_id','transition_type','from_block','to_block','generation','status','canonicality_status','empty_result','evidence_set_digest','provenance_json','committed_at'], existing[0].values[0]);
    if (!sameResult(row, result, digest, provenanceJson)) fail('PROCESSING_RESULT_INTEGRITY_CONFLICT');
    return readProcessingResult(database, result.resultId);
  }

  const execution = database.db.exec(
    'SELECT result_id FROM processing_results WHERE processing_execution_id = ?',
    [result.processingExecutionId]
  );
  if (execution.length && execution[0].values.length) fail('PROCESSING_RESULT_EXECUTION_CONFLICT');

  if (result.transitionType === 'CONTINUATION' || result.transitionType === 'REORG_REPLACEMENT') {
    const parent = database.db.exec('SELECT result_id, generation FROM processing_results WHERE result_id = ?', [result.parentResultId]);
    if (!parent.length || parent[0].values.length !== 1) fail('PROCESSING_RESULT_PARENT_NOT_FOUND');
    if (result.transitionType === 'CONTINUATION' && parent[0].values[0][1] !== result.generation) {
      fail('PROCESSING_RESULT_CONTINUATION_GENERATION_MISMATCH');
    }
    if (result.transitionType === 'REORG_REPLACEMENT' && parent[0].values[0][1] === result.generation) {
      fail('PROCESSING_RESULT_REORG_GENERATION_MUST_CHANGE');
    }
  }

  const snapshot = database.snapshot();
  let committed = false;
  try {
    database.db.run('BEGIN');
    database.db.run(
      'INSERT INTO processing_results (result_id, processing_execution_id, parent_result_id, transition_type, from_block, to_block, generation, status, canonicality_status, empty_result, evidence_set_digest, provenance_json, committed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [result.resultId, result.processingExecutionId, result.parentResultId ?? null, result.transitionType, result.fromBlock, result.toBlock, result.generation, result.status, result.canonicalityStatus, result.emptyResult ? 1 : 0, digest, provenanceJson, result.committedAt]
    );
    for (const member of ordered) {
      database.db.run(
        'INSERT INTO processing_result_evidence (result_id, ordinal, evidence_id, raw_event_id, identity_hash, raw_hash, canonical_hash, block_number, transaction_index, log_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [result.resultId, member.ordinal, member.evidence_id, member.raw_event_id, member.identity_hash, member.raw_hash, member.canonical_hash, member.block_number, member.transaction_index, member.log_index]
      );
    }
    database.db.run('COMMIT');
    committed = true;
  } finally {
    if (!committed) {
      try { database.db.run('ROLLBACK'); } catch {}
    }
  }

  try {
    writerFence.assertOwned();
    database.save();
  } catch (error) {
    database.restore(snapshot);
    throw error;
  }

  return readProcessingResult(database, result.resultId);
}

module.exports = {
  DIGEST_DOMAIN,
  hashEvidenceSet,
  persistProcessingResult,
  readProcessingResult,
};
