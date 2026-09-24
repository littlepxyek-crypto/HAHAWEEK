'use strict';

const crypto = require('node:crypto');

const DIGEST64 = /^(?:[0-9a-f]{64}|0x[0-9a-f]{64})$/;
const CHECKPOINT_DIGEST = /^0x[0-9a-f]{64}$/;
const GENERATION = /^(0|[1-9][0-9]*)$/;
const MAX_UINT64 = 18446744073709551615n;

const DOMAIN = 'HAHAWEEK-EVIDENCE-V4-CHECKPOINT';

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('F03_CANONICAL_NUMBER_INVALID');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort()
      .map(key => JSON.stringify(key) + ':' + canonicalize(value[key]))
      .join(',') + '}';
  }
  throw new Error('F03_CANONICAL_VALUE_INVALID');
}

function assertGeneration(value) {
  if (typeof value !== 'string' || !GENERATION.test(value)) {
    throw new Error('F03_GENERATION_INVALID');
  }
  let parsed;
  try {
    parsed = BigInt(value);
  } catch {
    throw new Error('F03_GENERATION_INVALID');
  }
  if (parsed > MAX_UINT64) throw new Error('F03_GENERATION_OVERFLOW');
  return value;
}

function assertBlock(value, code) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(code);
  }
  return value;
}

function assertDigest(value, code) {
  if (typeof value !== 'string' || !DIGEST64.test(value)) {
    throw new Error(code);
  }
  return value;
}

function assertCheckpointDigest(value) {
  if (typeof value !== 'string' || !CHECKPOINT_DIGEST.test(value)) {
    throw new Error('F03_CHECKPOINT_DIGEST_INVALID');
  }
  return value;
}

function assertTimestamp(value, code) {
  if (typeof value !== 'string' || value === '' || Number.isNaN(Date.parse(value))) {
    throw new Error(code);
  }
  return value;
}

function parseProvenance(value, expected) {
  if (typeof value !== 'string' || value === '') {
    throw new Error('F03_PROVENANCE_INVALID');
  }

  let provenance;
  try {
    provenance = JSON.parse(value);
  } catch {
    throw new Error('F03_PROVENANCE_INVALID');
  }

  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) {
    throw new Error('F03_PROVENANCE_INVALID');
  }

  const required = [
    'recordType',
    'recordId',
    'persistenceMechanism',
    'table',
    'key',
    'artifactId',
    'generation',
    'integrityDigest',
    'committedAt',
  ];

  for (const key of required) {
    if (provenance[key] === undefined || provenance[key] === null || provenance[key] === '') {
      throw new Error('F03_PROVENANCE_' + key.toUpperCase() + '_MISSING');
    }
  }

  if (provenance.persistenceMechanism !== 'sqlite') {
    throw new Error('F03_PROVENANCE_MECHANISM_INVALID');
  }

  for (const [key, value] of Object.entries(expected)) {
    if (provenance[key] !== value) {
      throw new Error('F03_PROVENANCE_' + key.toUpperCase() + '_MISMATCH');
    }
  }

  if (provenance.upstreamRecordId !== undefined && typeof provenance.upstreamRecordId !== 'string') {
    throw new Error('F03_PROVENANCE_UPSTREAM_INVALID');
  }

  return canonicalize(provenance);
}

function validateSegment(record) {
  if (!record || typeof record !== 'object') throw new Error('F03_SEGMENT_INVALID');
  if (typeof record.segmentId !== 'string' || record.segmentId === '') throw new Error('F03_SEGMENT_ID_INVALID');
  const fromBlock = assertBlock(record.fromBlock, 'F03_FROM_BLOCK_INVALID');
  const toBlock = assertBlock(record.toBlock, 'F03_TO_BLOCK_INVALID');
  if (fromBlock > toBlock) throw new Error('F03_RANGE_INVALID');
  const segmentDigest = assertDigest(record.segmentDigest, 'F03_SEGMENT_DIGEST_INVALID');
  const generation = assertGeneration(record.generation);
  const committedAt = assertTimestamp(record.committedAt, 'F03_COMMITTED_AT_INVALID');

  const provenance = parseProvenance(JSON.stringify(record.provenance), {
    recordType: 'segment',
    recordId: record.segmentId,
    table: 'f03_segments',
    key: record.segmentId,
    artifactId: record.segmentId,
    generation,
    integrityDigest: segmentDigest,
    committedAt,
    fromBlock,
    toBlock,
  });

  return {
    segmentId: record.segmentId,
    fromBlock,
    toBlock,
    segmentDigest,
    generation,
    provenance,
    committedAt,
  };
}

function validateManifest(record) {
  if (!record || typeof record !== 'object') throw new Error('F03_MANIFEST_INVALID');
  if (typeof record.manifestId !== 'string' || record.manifestId === '') throw new Error('F03_MANIFEST_ID_INVALID');
  const manifestDigest = assertDigest(record.manifestDigest, 'F03_MANIFEST_DIGEST_INVALID');
  const generation = assertGeneration(record.generation);
  if (typeof record.segmentId !== 'string' || record.segmentId === '') throw new Error('F03_MANIFEST_SEGMENT_ID_INVALID');
  const segmentDigest = assertDigest(record.segmentDigest, 'F03_MANIFEST_SEGMENT_DIGEST_INVALID');
  const committedAt = assertTimestamp(record.committedAt, 'F03_COMMITTED_AT_INVALID');

  const provenance = parseProvenance(JSON.stringify(record.provenance), {
    recordType: 'manifest',
    recordId: record.manifestId,
    table: 'f03_manifests',
    key: record.manifestId,
    artifactId: record.manifestId,
    upstreamRecordId: record.segmentId,
    generation,
    integrityDigest: manifestDigest,
    committedAt,
  });

  return {
    manifestId: record.manifestId,
    manifestDigest,
    generation,
    segmentId: record.segmentId,
    segmentDigest,
    provenance,
    committedAt,
  };
}

function checkpointDigestFor(generation, manifestDigest) {
  assertGeneration(generation);
  if (!DIGEST64.test(manifestDigest)) {
    throw new Error('F03_CHECKPOINT_MANIFEST_DIGEST_INVALID');
  }

  const canonicalManifestHash = manifestDigest.startsWith('0x')
    ? manifestDigest
    : '0x' + manifestDigest;

  const input = {
    generation,
    manifest_hash: canonicalManifestHash,
  };

  return '0x' + crypto.createHash('sha256')
    .update(Buffer.from(DOMAIN + '\0', 'utf8'))
    .update(Buffer.from(canonicalize(input), 'utf8'))
    .digest('hex');
}

function validateCheckpoint(record) {
  if (!record || typeof record !== 'object') throw new Error('F03_CHECKPOINT_INVALID');
  const checkpointDigest = assertCheckpointDigest(record.checkpointDigest);
  const generation = assertGeneration(record.generation);
  if (typeof record.manifestId !== 'string' || record.manifestId === '') throw new Error('F03_CHECKPOINT_MANIFEST_ID_INVALID');
  const manifestDigest = assertDigest(record.manifestDigest, 'F03_CHECKPOINT_MANIFEST_DIGEST_INVALID');
  const committedAt = assertTimestamp(record.committedAt, 'F03_COMMITTED_AT_INVALID');

  const expectedDigest = checkpointDigestFor(generation, manifestDigest);
  if (checkpointDigest !== expectedDigest) {
    throw new Error('F03_CHECKPOINT_DIGEST_MISMATCH');
  }

  const provenance = parseProvenance(JSON.stringify(record.provenance), {
    recordType: 'checkpoint',
    recordId: checkpointDigest,
    table: 'f03_checkpoints',
    key: checkpointDigest,
    artifactId: checkpointDigest,
    upstreamRecordId: record.manifestId,
    generation,
    integrityDigest: checkpointDigest,
    committedAt,
  });

  return {
    checkpointDigest,
    generation,
    manifestId: record.manifestId,
    manifestDigest,
    provenance,
    committedAt,
  };
}

function sameContent(row, expected) {
  return row.segment_id === expected.segmentId
    && row.from_block === expected.fromBlock
    && row.to_block === expected.toBlock
    && row.segment_digest === expected.segmentDigest
    && row.generation === expected.generation
    && row.provenance_json === expected.provenance
    && row.committed_at === expected.committedAt;
}

function sameManifest(row, expected) {
  return row.manifest_id === expected.manifestId
    && row.manifest_digest === expected.manifestDigest
    && row.generation === expected.generation
    && row.segment_id === expected.segmentId
    && row.segment_digest === expected.segmentDigest
    && row.provenance_json === expected.provenance
    && row.committed_at === expected.committedAt;
}

function sameCheckpoint(row, expected) {
  return row.checkpoint_digest === expected.checkpointDigest
    && row.generation === expected.generation
    && row.manifest_id === expected.manifestId
    && row.manifest_digest === expected.manifestDigest
    && row.provenance_json === expected.provenance
    && row.committed_at === expected.committedAt;
}

function classifySegment(db, record) {
  const rows = db.exec(
    'SELECT segment_id, from_block, to_block, segment_digest, generation, provenance_json, committed_at FROM f03_segments WHERE segment_id = ?',
    [record.segmentId]
  );
  if (!rows.length || !rows[0].values.length) return 'NOT_FOUND';
  return sameContent(rows[0].values[0].reduce((obj, value, index) => {
    obj[['segment_id','from_block','to_block','segment_digest','generation','provenance_json','committed_at'][index]] = value;
    return obj;
  }, {}), record) ? 'IDEMPOTENT' : 'INTEGRITY_CONFLICT';
}

function classifyManifest(db, record) {
  const rows = db.exec(
    'SELECT manifest_id, manifest_digest, generation, segment_id, segment_digest, provenance_json, committed_at FROM f03_manifests WHERE manifest_id = ?',
    [record.manifestId]
  );
  if (!rows.length || !rows[0].values.length) return 'NOT_FOUND';
  const row = rows[0].values[0].reduce((obj, value, index) => {
    obj[['manifest_id','manifest_digest','generation','segment_id','segment_digest','provenance_json','committed_at'][index]] = value;
    return obj;
  }, {});
  return sameManifest(row, record) ? 'IDEMPOTENT' : 'INTEGRITY_CONFLICT';
}

function classifyCheckpoint(db, record) {
  const rows = db.exec(
    'SELECT checkpoint_digest, generation, manifest_id, manifest_digest, provenance_json, committed_at FROM f03_checkpoints WHERE checkpoint_digest = ?',
    [record.checkpointDigest]
  );
  if (!rows.length || !rows[0].values.length) return 'NOT_FOUND';
  const row = rows[0].values[0].reduce((obj, value, index) => {
    obj[['checkpoint_digest','generation','manifest_id','manifest_digest','provenance_json','committed_at'][index]] = value;
    return obj;
  }, {});
  return sameCheckpoint(row, record) ? 'IDEMPOTENT' : 'INTEGRITY_CONFLICT';
}

function insertSegment(db, record) {
  db.run(
    'INSERT INTO f03_segments (segment_id, from_block, to_block, segment_digest, generation, provenance_json, committed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [record.segmentId, record.fromBlock, record.toBlock, record.segmentDigest, record.generation, record.provenance, record.committedAt]
  );
}

function insertManifest(db, record) {
  db.run(
    'INSERT INTO f03_manifests (manifest_id, manifest_digest, generation, segment_id, segment_digest, provenance_json, committed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [record.manifestId, record.manifestDigest, record.generation, record.segmentId, record.segmentDigest, record.provenance, record.committedAt]
  );
}

function insertCheckpoint(db, record) {
  db.run(
    'INSERT INTO f03_checkpoints (checkpoint_digest, generation, manifest_id, manifest_digest, provenance_json, committed_at) VALUES (?, ?, ?, ?, ?, ?)',
    [record.checkpointDigest, record.generation, record.manifestId, record.manifestDigest, record.provenance, record.committedAt]
  );
}

function readOne(db, sql, params) {
  const result = db.exec(sql, params);
  return result.length && result[0].values.length ? result[0].values[0] : null;
}

function rowObject(columns, row) {
  if (!row) return null;
  return columns.reduce((obj, key, index) => {
    obj[key] = row[index];
    return obj;
  }, {});
}

function assertPersistedProvenance(provenanceJson, expected) {
  return parseProvenance(provenanceJson, expected);
}

function verifyChainRows(segment, manifest, checkpoint, fromBlock, toBlock) {
  if (!segment || !manifest || !checkpoint) throw new Error('F03_CHAIN_NOT_FOUND');

  if (segment.from_block !== fromBlock || segment.to_block !== toBlock) {
    throw new Error('F03_RANGE_MISMATCH');
  }

  if (manifest.segment_id !== segment.segment_id || manifest.segment_digest !== segment.segment_digest) {
    throw new Error('F03_MANIFEST_SEGMENT_MISMATCH');
  }

  if (checkpoint.manifest_id !== manifest.manifest_id || checkpoint.manifest_digest !== manifest.manifest_digest) {
    throw new Error('F03_CHECKPOINT_MANIFEST_MISMATCH');
  }

  if (segment.generation !== manifest.generation || manifest.generation !== checkpoint.generation) {
    throw new Error('F03_GENERATION_MISMATCH');
  }

  assertDigest(segment.segment_digest, 'F03_SEGMENT_DIGEST_INVALID');
  assertDigest(manifest.manifest_digest, 'F03_MANIFEST_DIGEST_INVALID');
  assertCheckpointDigest(checkpoint.checkpoint_digest);
  assertDigest(checkpoint.manifest_digest, 'F03_CHECKPOINT_MANIFEST_DIGEST_INVALID');

  const expectedCheckpointDigest = checkpointDigestFor(checkpoint.generation, checkpoint.manifest_digest);
  if (checkpoint.checkpoint_digest !== expectedCheckpointDigest) {
    throw new Error('F03_CHECKPOINT_DIGEST_MISMATCH');
  }

  assertPersistedProvenance(segment.provenance_json, {
    recordType: 'segment',
    recordId: segment.segment_id,
    table: 'f03_segments',
    key: segment.segment_id,
    artifactId: segment.segment_id,
    generation: segment.generation,
    integrityDigest: segment.segment_digest,
    committedAt: segment.committed_at,
    fromBlock: segment.from_block,
    toBlock: segment.to_block,
  });

  assertPersistedProvenance(manifest.provenance_json, {
    recordType: 'manifest',
    recordId: manifest.manifest_id,
    table: 'f03_manifests',
    key: manifest.manifest_id,
    artifactId: manifest.manifest_id,
    upstreamRecordId: manifest.segment_id,
    generation: manifest.generation,
    integrityDigest: manifest.manifest_digest,
    committedAt: manifest.committed_at,
  });

  assertPersistedProvenance(checkpoint.provenance_json, {
    recordType: 'checkpoint',
    recordId: checkpoint.checkpoint_digest,
    table: 'f03_checkpoints',
    key: checkpoint.checkpoint_digest,
    artifactId: checkpoint.checkpoint_digest,
    upstreamRecordId: checkpoint.manifest_id,
    generation: checkpoint.generation,
    integrityDigest: checkpoint.checkpoint_digest,
    committedAt: checkpoint.committed_at,
  });
}

function commitF03AuthorityChain({ database, writerFence, segment, manifest, checkpoint }) {
  if (!database || !database.db || typeof database.save !== 'function') {
    throw new Error('F03_DATABASE_REQUIRED');
  }
  if (!writerFence || typeof writerFence.assertOwned !== 'function') {
    throw new Error('F03_WRITER_FENCE_REQUIRED');
  }

  const validSegment = validateSegment(segment);
  const validManifest = validateManifest(manifest);
  const validCheckpoint = validateCheckpoint(checkpoint);

  if (validManifest.generation !== validSegment.generation) {
    throw new Error('F03_GENERATION_MISMATCH');
  }
  if (validManifest.segmentId !== validSegment.segmentId || validManifest.segmentDigest !== validSegment.segmentDigest) {
    throw new Error('F03_MANIFEST_SEGMENT_MISMATCH');
  }
  if (validCheckpoint.generation !== validManifest.generation) {
    throw new Error('F03_GENERATION_MISMATCH');
  }
  if (validCheckpoint.manifestId !== validManifest.manifestId || validCheckpoint.manifestDigest !== validManifest.manifestDigest) {
    throw new Error('F03_CHECKPOINT_MANIFEST_MISMATCH');
  }

  writerFence.assertOwned();

  const snapshot = database.snapshot();
  let transactionOpen = false;

  try {
    database.db.run('BEGIN');
    transactionOpen = true;

    const segmentClass = classifySegment(database.db, validSegment);
    if (segmentClass === 'INTEGRITY_CONFLICT') throw new Error('F03_INTEGRITY_CONFLICT');
    if (segmentClass === 'NOT_FOUND') insertSegment(database.db, validSegment);

    const manifestClass = classifyManifest(database.db, validManifest);
    if (manifestClass === 'INTEGRITY_CONFLICT') throw new Error('F03_INTEGRITY_CONFLICT');
    if (manifestClass === 'NOT_FOUND') insertManifest(database.db, validManifest);

    const checkpointClass = classifyCheckpoint(database.db, validCheckpoint);
    if (checkpointClass === 'INTEGRITY_CONFLICT') throw new Error('F03_INTEGRITY_CONFLICT');
    if (checkpointClass === 'NOT_FOUND') insertCheckpoint(database.db, validCheckpoint);

    const fullyIdempotent =
      segmentClass === 'IDEMPOTENT' &&
      manifestClass === 'IDEMPOTENT' &&
      checkpointClass === 'IDEMPOTENT';

    const linkedSegment = readOne(
      database.db,
      'SELECT segment_id, from_block, to_block, segment_digest, generation, provenance_json, committed_at FROM f03_segments WHERE segment_id = ?',
      [validSegment.segmentId]
    );
    const linkedManifest = readOne(
      database.db,
      'SELECT manifest_id, manifest_digest, generation, segment_id, segment_digest, provenance_json, committed_at FROM f03_manifests WHERE manifest_id = ?',
      [validManifest.manifestId]
    );
    const linkedCheckpoint = readOne(
      database.db,
      'SELECT checkpoint_digest, generation, manifest_id, manifest_digest, provenance_json, committed_at FROM f03_checkpoints WHERE checkpoint_digest = ?',
      [validCheckpoint.checkpointDigest]
    );

    verifyChainRows(
      rowObject(['segment_id','from_block','to_block','segment_digest','generation','provenance_json','committed_at'], linkedSegment),
      rowObject(['manifest_id','manifest_digest','generation','segment_id','segment_digest','provenance_json','committed_at'], linkedManifest),
      rowObject(['checkpoint_digest','generation','manifest_id','manifest_digest','provenance_json','committed_at'], linkedCheckpoint),
      validSegment.fromBlock,
      validSegment.toBlock
    );

    database.db.run('COMMIT');
    transactionOpen = false;

    try {
      database.save();
    } catch (error) {
      database.restore(snapshot);
      throw new Error('F03_DURABLE_SAVE_FAILED', { cause: error });
    }

    return {
      status: fullyIdempotent ? 'IDEMPOTENT' : 'COMMITTED',
      segmentId: validSegment.segmentId,
      manifestId: validManifest.manifestId,
      checkpointDigest: validCheckpoint.checkpointDigest,
      generation: validSegment.generation,
      cursorBlock: validSegment.toBlock,
    };
  } catch (error) {
    if (transactionOpen) {
      try {
        database.db.run('ROLLBACK');
      } catch {
        // The original deterministic failure remains authoritative.
      }
    }
    throw error;
  }
}

function readF03AuthorityChain({ database, fromBlock, toBlock }) {
  if (!database || !database.db) throw new Error('F03_DATABASE_REQUIRED');
  assertBlock(fromBlock, 'F03_FROM_BLOCK_INVALID');
  assertBlock(toBlock, 'F03_TO_BLOCK_INVALID');
  if (fromBlock > toBlock) throw new Error('F03_RANGE_INVALID');

  const segments = database.db.exec(
    'SELECT segment_id, from_block, to_block, segment_digest, generation, provenance_json, committed_at FROM f03_segments WHERE from_block = ? AND to_block = ? ORDER BY segment_id',
    [fromBlock, toBlock]
  );

  const segmentRows = segments.length ? segments[0].values : [];
  if (segmentRows.length === 0) throw new Error('F03_CHAIN_NOT_FOUND');
  if (segmentRows.length !== 1) throw new Error('F03_CHAIN_AMBIGUOUS');

  const segment = rowObject(
    ['segment_id','from_block','to_block','segment_digest','generation','provenance_json','committed_at'],
    segmentRows[0]
  );

  const manifests = database.db.exec(
    'SELECT manifest_id, manifest_digest, generation, segment_id, segment_digest, provenance_json, committed_at FROM f03_manifests WHERE segment_id = ? AND segment_digest = ? ORDER BY manifest_id',
    [segment.segment_id, segment.segment_digest]
  );
  const manifestRows = manifests.length ? manifests[0].values : [];
  if (manifestRows.length === 0) throw new Error('F03_MANIFEST_NOT_FOUND');
  if (manifestRows.length !== 1) throw new Error('F03_MANIFEST_AMBIGUOUS');

  const manifest = rowObject(
    ['manifest_id','manifest_digest','generation','segment_id','segment_digest','provenance_json','committed_at'],
    manifestRows[0]
  );

  const checkpoints = database.db.exec(
    'SELECT checkpoint_digest, generation, manifest_id, manifest_digest, provenance_json, committed_at FROM f03_checkpoints WHERE manifest_id = ? AND manifest_digest = ? ORDER BY checkpoint_digest',
    [manifest.manifest_id, manifest.manifest_digest]
  );
  const checkpointRows = checkpoints.length ? checkpoints[0].values : [];
  if (checkpointRows.length === 0) throw new Error('F03_CHECKPOINT_NOT_FOUND');
  if (checkpointRows.length !== 1) throw new Error('F03_CHECKPOINT_AMBIGUOUS');

  const checkpoint = rowObject(
    ['checkpoint_digest','generation','manifest_id','manifest_digest','provenance_json','committed_at'],
    checkpointRows[0]
  );

  verifyChainRows(segment, manifest, checkpoint, fromBlock, toBlock);

  return {
    status: 'VERIFIED',
    fromBlock,
    toBlock,
    segmentId: segment.segment_id,
    manifestId: manifest.manifest_id,
    manifestDigest: manifest.manifest_digest,
    checkpointDigest: checkpoint.checkpoint_digest,
    generation: segment.generation,
    cursorBlock: segment.to_block,
  };
}

module.exports = {
  DOMAIN,
  checkpointDigestFor,
  commitF03AuthorityChain,
  readF03AuthorityChain,
  validateSegment,
  validateManifest,
  validateCheckpoint,
};
