'use strict';

const crypto = require('node:crypto');
const { RPC_URL, CHAIN_ID } = require('./config');
const { canonicalUtf8 } = require('../reference/v4/jcs');

const CBDR_DOMAIN = 'HAHAWEEK-CANONICAL-DECISION-RECORD-V1';
const SNAPSHOT_DOMAIN = 'HAHAWEEK-CANONICAL-DECISION-SNAPSHOT-V1';
const HEX32_RE = /^0x[0-9a-f]{64}$/;
const CBDR_ID_RE = /^cdbr:v1:[0-9a-f]{64}$/;
const SNAPSHOT_ID_RE = /^cds:v1:[0-9a-f]{64}$/;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function assertNonNegativeSafeInteger(value, code = 'INVALID_RANGE') {
  if (!Number.isSafeInteger(value) || value < 0) fail(code);
}

function assertHash(value, code) {
  if (typeof value !== 'string' || !HEX32_RE.test(value)) fail(code);
}

function assertString(value, code) {
  if (typeof value !== 'string' || value.length === 0) fail(code);
}

function sha256Domain(domain, payload) {
  return crypto.createHash('sha256')
    .update(Buffer.concat([
      Buffer.from(domain, 'utf8'),
      Buffer.from([0x00]),
      canonicalUtf8(payload),
    ]))
    .digest('hex');
}

function canonicalSourceId(sourceId = `rpc:${RPC_URL}`) {
  assertString(sourceId, 'INVALID_SOURCE_ID');
  return sourceId;
}

function validateAcquiredAt(acquiredAt) {
  assertString(acquiredAt, 'INVALID_ACQUIRED_AT');
  return acquiredAt;
}

function createRecordDigest(record) {
  const payload = {
    block_hash: record.block_hash,
    block_number: String(record.block_number),
    chain_id: String(record.chain_id),
    confirmation_depth: String(record.confirmation_depth),
    decision_head_block: String(record.decision_head_block),
    parent_block_hash: record.parent_block_hash,
    source_id: record.source_id,
  };
  return `cdbr:v1:${sha256Domain(CBDR_DOMAIN, payload)}`;
}

function createSnapshotId({ chainId, fromBlock, toBlock, decisionHeadBlock, confirmationDepth, sourceId, records }) {
  const payload = {
    block_identities: records.map(record => ({
      block_hash: record.block_hash,
      block_number: String(record.block_number),
      chain_id: String(record.chain_id),
    })),
    chain_id: String(chainId),
    confirmation_depth: String(confirmationDepth),
    contract: SNAPSHOT_DOMAIN,
    decision_head_block: String(decisionHeadBlock),
    from_block: String(fromBlock),
    source_id: sourceId,
    to_block: String(toBlock),
  };
  return `cds:v1:${sha256Domain(SNAPSHOT_DOMAIN, payload)}`;
}

function validateHeader(header, expectedBlock, chainId) {
  if (!header || typeof header !== 'object') fail('INVALID_BLOCK_HEADER');
  if (header.number !== expectedBlock) fail('BLOCK_NUMBER_MISMATCH');
  assertHash(header.hash, 'MALFORMED_BLOCK_HASH');
  assertHash(header.parentHash, 'MALFORMED_PARENT_HASH');

  if (header.chainId !== undefined && header.chainId !== null) {
    const actual = Number(header.chainId);
    if (!Number.isSafeInteger(actual) || actual !== chainId) fail('CHAIN_ID_MISMATCH');
  }

  return {
    block_number: expectedBlock,
    block_hash: header.hash,
    parent_block_hash: header.parentHash,
  };
}

function queryOne(db, sql, params) {
  const statement = db.prepare(sql);
  try {
    statement.bind(params);
    if (!statement.step()) return null;
    return statement.getAsObject();
  } finally {
    statement.free();
  }
}

function queryAll(db, sql, params) {
  const statement = db.prepare(sql);
  const rows = [];
  try {
    statement.bind(params);
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}

function assertWriter(writerFence) {
  if (!writerFence || typeof writerFence.assertOwned !== 'function') {
    fail('WRITER_FENCE_REQUIRED');
  }
  try {
    writerFence.assertOwned();
  } catch (error) {
    const wrapped = new Error(error && error.code ? error.code : 'WRITER_FENCE_REQUIRED');
    wrapped.code = wrapped.message;
    throw wrapped;
  }
}

function assertRecordIntegrity(record) {
  assertNonNegativeSafeInteger(record.chain_id, 'CHAIN_ID_MISMATCH');
  assertNonNegativeSafeInteger(record.block_number);
  assertNonNegativeSafeInteger(record.decision_head_block);
  assertNonNegativeSafeInteger(record.confirmation_depth);
  assertHash(record.block_hash, 'MALFORMED_BLOCK_HASH');
  assertHash(record.parent_block_hash, 'MALFORMED_PARENT_HASH');
  canonicalSourceId(record.source_id);
  validateAcquiredAt(record.acquired_at);

  const expected = createRecordDigest(record);
  if (record.record_digest !== expected) fail('CBDR_INTEGRITY_CONFLICT');
}

function readStoredRecord(db, chainId, blockNumber, blockHash) {
  return queryOne(
    db,
    `SELECT record_digest, chain_id, block_number, block_hash, parent_block_hash,
            decision_head_block, confirmation_depth, source_id, acquired_at
       FROM canonical_block_decisions
      WHERE chain_id = ? AND block_number = ? AND block_hash = ?`,
    [chainId, blockNumber, blockHash]
  );
}

function persistRecord(db, record) {
  assertRecordIntegrity(record);

  const semantic = queryAll(
    db,
    `SELECT record_digest, chain_id, block_number, block_hash, parent_block_hash,
            decision_head_block, confirmation_depth, source_id, acquired_at
       FROM canonical_block_decisions
      WHERE chain_id = ? AND block_number = ?`,
    [record.chain_id, record.block_number]
  );

  const existing = semantic.find(row => row.block_hash === record.block_hash);
  if (existing) {
    if (
      existing.record_digest !== record.record_digest ||
      existing.parent_block_hash !== record.parent_block_hash ||
      existing.decision_head_block !== record.decision_head_block ||
      existing.confirmation_depth !== record.confirmation_depth ||
      existing.source_id !== record.source_id
    ) {
      fail('CBDR_INTEGRITY_CONFLICT');
    }
    return existing;
  }

  try {
    db.run(
      `INSERT INTO canonical_block_decisions
        (record_digest, chain_id, block_number, block_hash, parent_block_hash,
         decision_head_block, confirmation_depth, source_id, acquired_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.record_digest,
        record.chain_id,
        record.block_number,
        record.block_hash,
        record.parent_block_hash,
        record.decision_head_block,
        record.confirmation_depth,
        record.source_id,
        record.acquired_at,
      ]
    );
  } catch (error) {
    const wrapped = new Error('CBDR_PERSISTENCE_FAILURE');
    wrapped.code = 'CBDR_PERSISTENCE_FAILURE';
    wrapped.cause = error;
    throw wrapped;
  }

  return record;
}

function reconstructSnapshot(db, snapshotId) {
  if (typeof snapshotId !== 'string' || !SNAPSHOT_ID_RE.test(snapshotId)) {
    fail('SNAPSHOT_INTEGRITY_CONFLICT');
  }

  const snapshot = queryOne(
    db,
    `SELECT snapshot_id, chain_id, from_block, to_block, decision_head_block,
            confirmation_depth, source_id, created_at
       FROM canonical_decision_snapshots
      WHERE snapshot_id = ?`,
    [snapshotId]
  );
  if (!snapshot) fail('SNAPSHOT_MEMBER_MISSING');

  const members = queryAll(
    db,
    `SELECT ordinal, block_number, record_digest, block_hash
       FROM canonical_decision_snapshot_blocks
      WHERE snapshot_id = ?
      ORDER BY ordinal ASC`,
    [snapshotId]
  );

  const expectedCount = snapshot.to_block - snapshot.from_block + 1;
  if (members.length !== expectedCount) fail('SNAPSHOT_MEMBER_MISSING');

  const records = [];
  for (let i = 0; i < members.length; i += 1) {
    const member = members[i];
    const expectedBlock = snapshot.from_block + i;
    if (member.ordinal !== i || member.block_number !== expectedBlock) {
      fail('SNAPSHOT_INTEGRITY_CONFLICT');
    }

    const record = queryOne(
      db,
      `SELECT record_digest, chain_id, block_number, block_hash, parent_block_hash,
              decision_head_block, confirmation_depth, source_id, acquired_at
         FROM canonical_block_decisions
        WHERE record_digest = ?`,
      [member.record_digest]
    );
    if (!record || record.block_hash !== member.block_hash) {
      fail('SNAPSHOT_MEMBER_MISSING');
    }
    assertRecordIntegrity(record);
    records.push(record);
  }

  for (let i = 1; i < records.length; i += 1) {
    if (records[i].parent_block_hash !== records[i - 1].block_hash) {
      fail('PARENT_LINK_MISMATCH');
    }
  }

  if (
    createSnapshotId({
      chainId: snapshot.chain_id,
      fromBlock: snapshot.from_block,
      toBlock: snapshot.to_block,
      decisionHeadBlock: snapshot.decision_head_block,
      confirmationDepth: snapshot.confirmation_depth,
      sourceId: snapshot.source_id,
      records,
    }) !== snapshot.snapshot_id
  ) {
    fail('CANONICAL_DECISION_REPLAY_MISMATCH');
  }

  return { ...snapshot, records };
}

function findCanonicalBlock(db, { chainId, blockNumber, blockHash }) {
  assertNonNegativeSafeInteger(chainId, 'CHAIN_ID_MISMATCH');
  assertNonNegativeSafeInteger(blockNumber);
  assertHash(blockHash, 'MALFORMED_BLOCK_HASH');
  const record = readStoredRecord(db, chainId, blockNumber, blockHash);
  if (!record) return null;
  assertRecordIntegrity(record);
  return record;
}

function findBranchCommonAncestor(db, { chainId, firstBlockHash, secondBlockHash }) {
  assertNonNegativeSafeInteger(chainId, 'CHAIN_ID_MISMATCH');
  assertHash(firstBlockHash, 'MALFORMED_BLOCK_HASH');
  assertHash(secondBlockHash, 'MALFORMED_BLOCK_HASH');

  const walk = (startHash) => {
    const seen = new Set();
    const chain = new Map();
    let currentHash = startHash;

    while (true) {
      if (seen.has(currentHash)) fail('CANONICAL_DECISION_BRANCH_INCOMPLETE');
      seen.add(currentHash);

      const row = queryOne(
        db,
        `SELECT record_digest, chain_id, block_number, block_hash, parent_block_hash,
                decision_head_block, confirmation_depth, source_id, acquired_at
           FROM canonical_block_decisions
          WHERE chain_id = ? AND block_hash = ?
          ORDER BY block_number DESC`,
        [chainId, currentHash]
      );
      if (!row) fail('CANONICAL_DECISION_BRANCH_INCOMPLETE');
      assertRecordIntegrity(row);
      chain.set(row.block_hash, row);

      if (row.block_number === 0) break;
      currentHash = row.parent_block_hash;
    }

    return chain;
  };

  const first = walk(firstBlockHash);
  const second = walk(secondBlockHash);

  for (const [hash, row] of first) {
    if (second.has(hash)) {
      return row;
    }
  }

  fail('COMMON_ANCESTOR_MISSING');
}

function createCanonicalDecisionInput({
  provider,
  db,
  writerFence,
  chainId = CHAIN_ID,
  confirmations,
  sourceId = `rpc:${RPC_URL}`,
  latestBlock,
  fromBlock,
  toBlock,
  acquiredAt = new Date().toISOString(),
}) {
  return (async () => {
    assertWriter(writerFence);

    if (!provider || typeof provider.getNetwork !== 'function' || typeof provider.getBlock !== 'function') {
      fail('PROVIDER_REQUIRED');
    }
    if (!db || typeof db.run !== 'function' || typeof db.prepare !== 'function') {
      fail('DATABASE_REQUIRED');
    }

    assertNonNegativeSafeInteger(chainId, 'CHAIN_ID_MISMATCH');
    assertNonNegativeSafeInteger(confirmations, 'INVALID_CONFIRMATIONS');
    assertNonNegativeSafeInteger(fromBlock);
    assertNonNegativeSafeInteger(toBlock);
    canonicalSourceId(sourceId);
    validateAcquiredAt(acquiredAt);

    const network = await provider.getNetwork();
    const actualChainId = Number(network.chainId);
    if (!Number.isSafeInteger(actualChainId) || actualChainId !== chainId) {
      fail('CHAIN_ID_MISMATCH');
    }

    const observedLatest =
      latestBlock === undefined
        ? await provider.getBlockNumber()
        : latestBlock;

    assertNonNegativeSafeInteger(observedLatest, 'INVALID_HEAD_BLOCK');
    if (observedLatest < confirmations) fail('RANGE_ABOVE_DECISION_HEAD');

    const decisionHeadBlock = observedLatest - confirmations;
    if (!(0 <= fromBlock && fromBlock <= toBlock && toBlock <= decisionHeadBlock)) {
      fail('RANGE_ABOVE_DECISION_HEAD');
    }

    assertWriter(writerFence);

    const headers = [];
    for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber += 1) {
      const header = await provider.getBlock(blockNumber);
      headers.push(validateHeader(header, blockNumber, chainId));
    }

    if (fromBlock > 0 && headers[0].parent_block_hash) {
      const persistedParent = findCanonicalBlock(
        db,
        { chainId, blockNumber: fromBlock - 1, blockHash: headers[0].parent_block_hash }
      );

      if (!persistedParent) {
        const parentHeader = await provider.getBlock(fromBlock - 1);
        const parent = validateHeader(parentHeader, fromBlock - 1, chainId);
        const parentRecord = {
          ...parent,
          chain_id: chainId,
          decision_head_block: decisionHeadBlock,
          confirmation_depth: confirmations,
          source_id: sourceId,
          acquired_at: acquiredAt,
        };
        parentRecord.record_digest = createRecordDigest(parentRecord);
        headers.unshift(parentRecord);
      }
    }

    for (let i = 1; i < headers.length; i += 1) {
      if (headers[i].parent_block_hash !== headers[i - 1].block_hash) {
        fail('PARENT_LINK_MISMATCH');
      }
    }

    const records = headers.map(header => {
      if (header.record_digest) return header;
      const record = {
        ...header,
        chain_id: chainId,
        decision_head_block: decisionHeadBlock,
        confirmation_depth: confirmations,
        source_id: sourceId,
        acquired_at: acquiredAt,
      };
      record.record_digest = createRecordDigest(record);
      return record;
    });

    const snapshotRecords = records.filter(
      record => record.block_number >= fromBlock && record.block_number <= toBlock
    );

    const snapshotId = createSnapshotId({
      chainId,
      fromBlock,
      toBlock,
      decisionHeadBlock,
      confirmationDepth: confirmations,
      sourceId,
      records: snapshotRecords,
    });

    assertWriter(writerFence);
    db.run('BEGIN');
    let committed = false;
    try {
      for (const record of records) {
        assertWriter(writerFence);
        persistRecord(db, record);
      }

      assertWriter(writerFence);
      const existingSnapshot = queryOne(
        db,
        `SELECT snapshot_id, chain_id, from_block, to_block, decision_head_block,
                confirmation_depth, source_id, created_at
           FROM canonical_decision_snapshots
          WHERE snapshot_id = ?`,
        [snapshotId]
      );

      if (!existingSnapshot) {
        db.run(
          `INSERT INTO canonical_decision_snapshots
            (snapshot_id, chain_id, from_block, to_block, decision_head_block,
             confirmation_depth, source_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            snapshotId,
            chainId,
            fromBlock,
            toBlock,
            decisionHeadBlock,
            confirmations,
            sourceId,
            acquiredAt,
          ]
        );

        for (let i = 0; i < snapshotRecords.length; i += 1) {
          assertWriter(writerFence);
          const record = snapshotRecords[i];
          db.run(
            `INSERT INTO canonical_decision_snapshot_blocks
              (snapshot_id, ordinal, block_number, record_digest, block_hash)
             VALUES (?, ?, ?, ?, ?)`,
            [snapshotId, i, record.block_number, record.record_digest, record.block_hash]
          );
        }
      }

      assertWriter(writerFence);
      db.run('COMMIT');
      committed = true;
    } finally {
      if (!committed) {
        try { db.run('ROLLBACK'); } catch {}
      }
    }

    assertWriter(writerFence);
    return reconstructSnapshot(db, snapshotId);
  })();
}

module.exports = {
  CBDR_DOMAIN,
  SNAPSHOT_DOMAIN,
  createRecordDigest,
  createSnapshotId,
  findCanonicalBlock,
  findBranchCommonAncestor,
  reconstructSnapshot,
  createCanonicalDecisionInput,
};
