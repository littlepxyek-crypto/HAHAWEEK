'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDatabase } = require('../src/core/database');
const { createWriterFence } = require('../src/core/single-writer-fence');
const {
  createRecordDigest,
  createSnapshotId,
  createCanonicalDecisionInput,
  findCanonicalBlock,
  findBranchCommonAncestor,
  reconstructSnapshot,
} = require('../src/core/canonical-decision-input');

const SOURCE = 'rpc:https://rpc.mainnet.chain.robinhood.com';
const ZERO = '0x' + '0'.repeat(64);
const A = '0x' + 'a'.repeat(64);
const B = '0x' + 'b'.repeat(64);
const C = '0x' + 'c'.repeat(64);
const P = '0x' + 'd'.repeat(64);

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-canonical-decision-'));
}

function fence(dir) {
  const writer = createWriterFence({
    filename: path.join(dir, 'writer-fence.json'),
    ownerId: 'test-writer',
    leaseMs: 60_000,
  });
  writer.acquire();
  return writer;
}

function header(number, hash, parentHash) {
  return { number, hash, parentHash };
}

function providerFor(blocks, chainId = 4663) {
  return {
    async getNetwork() {
      return { chainId: BigInt(chainId) };
    },
    async getBlock(number) {
      const value = blocks[number];
      if (!value) return null;
      return value;
    },
  };
}

function dbRow(database, sql, params = []) {
  const statement = database.db.prepare(sql);
  try {
    statement.bind(params);
    if (!statement.step()) return null;
    return statement.getAsObject();
  } finally {
    statement.free();
  }
}

test('STEP 578 golden CBDR and snapshot vectors are exact', async () => {
  const database = await createDatabase(':memory:');
  const writer = fence(tempDir());

  const vectorRecord = {
    block_hash: A,
    block_number: 100,
    chain_id: 4663,
    confirmation_depth: 3,
    decision_head_block: 100,
    parent_block_hash: ZERO,
    source_id: SOURCE,
    acquired_at: '2026-01-01T00:00:00.000Z',
  };
  assert.equal(
    createRecordDigest(vectorRecord),
    'cdbr:v1:23dc1e2070bab3f442498549455ed3076e2ffdf7f40975745422c880dd605fe4'
  );

  const blocks = {
    99: header(99, P, ZERO),
    100: header(100, A, P),
    101: header(101, B, A),
  };

  const result = await createCanonicalDecisionInput({
    provider: providerFor(blocks),
    db: database.db,
    writerFence: writer,
    chainId: 4663,
    confirmations: 3,
    sourceId: SOURCE,
    latestBlock: 104,
    fromBlock: 100,
    toBlock: 101,
    acquiredAt: '2026-01-01T00:00:00.000Z',
  });

  assert.equal(result.records[0].parent_block_hash, P);
  assert.equal(
    result.records[1].record_digest,
    'cdbr:v1:c38b29f4100f64b7bf8e9ca8eea0da557161d4354e182b0b9613fa0f7d70aeb9'
  );
  assert.equal(
    result.snapshot_id,
    'cds:v1:6e726bea56b89112c8b40d1825c5343031abcb024586f94610a1fef6b176bf8e'
  );
  assert.equal(createRecordDigest(result.records[0]), result.records[0].record_digest);
  assert.equal(
    createSnapshotId({
      chainId: 4663,
      fromBlock: 100,
      toBlock: 101,
      decisionHeadBlock: 101,
      confirmationDepth: 3,
      sourceId: SOURCE,
      records: result.records,
    }),
    result.snapshot_id
  );

  database.close();
});

test('STEP 578 exact range above decision head fails closed', async () => {
  const database = await createDatabase(':memory:');
  const writer = fence(tempDir());
  const blocks = { 100: header(100, A, ZERO), 101: header(101, B, A) };

  await assert.rejects(
    () => createCanonicalDecisionInput({
      provider: providerFor(blocks),
      db: database.db,
      writerFence: writer,
      chainId: 4663,
      confirmations: 3,
      latestBlock: 103,
      fromBlock: 100,
      toBlock: 101,
      acquiredAt: '2026-01-01T00:00:00.000Z',
    }),
    error => error.code === 'RANGE_ABOVE_DECISION_HEAD'
  );

  database.close();
});

test('STEP 578 wrong number, chain, malformed hash, and parent mismatch fail closed', async () => {
  const cases = [
    {
      name: 'wrong number',
      blocks: { 100: header(99, A, ZERO) },
      expected: 'BLOCK_NUMBER_MISMATCH',
    },
    {
      name: 'wrong chain',
      provider: providerFor({ 100: header(100, A, ZERO) }, 1),
      expected: 'CHAIN_ID_MISMATCH',
    },
    {
      name: 'malformed hash',
      blocks: { 100: header(100, '0xabc', ZERO) },
      expected: 'MALFORMED_BLOCK_HASH',
    },
    {
      name: 'malformed parent',
      blocks: { 100: header(100, A, '0xabc') },
      expected: 'MALFORMED_PARENT_HASH',
    },
  ];

  for (const item of cases) {
    const database = await createDatabase(':memory:');
    const writer = fence(tempDir());
    const provider = item.provider || providerFor(item.blocks);
    await assert.rejects(
      () => createCanonicalDecisionInput({
        provider,
        db: database.db,
        writerFence: writer,
        chainId: 4663,
        confirmations: 0,
        latestBlock: 100,
        fromBlock: 100,
        toBlock: 100,
        acquiredAt: '2026-01-01T00:00:00.000Z',
      }),
      error => error.code === item.expected
    );
    database.close();
  }

  const database = await createDatabase(':memory:');
  const writer = fence(tempDir());
  await assert.rejects(
    () => createCanonicalDecisionInput({
      provider: providerFor({
        99: header(99, P, ZERO),
        100: header(100, A, P),
        101: header(101, B, C),
      }),
      db: database.db,
      writerFence: writer,
      chainId: 4663,
      confirmations: 0,
      latestBlock: 101,
      fromBlock: 100,
      toBlock: 101,
      acquiredAt: '2026-01-01T00:00:00.000Z',
    }),
    error => error.code === 'PARENT_LINK_MISMATCH'
  );
  database.close();
});

test('STEP 578 identical replay is deterministic and idempotent', async () => {
  const database = await createDatabase(':memory:');
  const writer = fence(tempDir());
  const provider = providerFor({
    99: header(99, P, ZERO),
    100: header(100, A, P),
    101: header(101, B, A),
  });

  const input = {
    provider,
    db: database.db,
    writerFence: writer,
    chainId: 4663,
    confirmations: 3,
    sourceId: SOURCE,
    latestBlock: 104,
    fromBlock: 100,
    toBlock: 101,
    acquiredAt: '2026-01-01T00:00:00.000Z',
  };

  const first = await createCanonicalDecisionInput(input);
  const second = await createCanonicalDecisionInput(input);

  assert.equal(second.snapshot_id, first.snapshot_id);
  assert.equal(
    dbRow(database, 'SELECT COUNT(*) AS count FROM canonical_decision_snapshots').count,
    1
  );
  assert.equal(
    dbRow(database, 'SELECT COUNT(*) AS count FROM canonical_block_decisions').count,
    2
  );

  database.close();
});

test('STEP 578 competing branches are preserved and common ancestor is deterministic', async () => {
  const database = await createDatabase(':memory:');
  const writer = fence(tempDir());

  await createCanonicalDecisionInput({
    provider: providerFor({
      99: header(99, C, ZERO),
      100: header(100, A, C),
    }),
    db: database.db,
    writerFence: writer,
    chainId: 4663,
    confirmations: 0,
    latestBlock: 100,
    fromBlock: 100,
    toBlock: 100,
    sourceId: SOURCE,
    acquiredAt: '2026-01-01T00:00:00.000Z',
  });

  await createCanonicalDecisionInput({
    provider: providerFor({
      99: header(99, C, ZERO),
      100: header(100, B, C),
    }),
    db: database.db,
    writerFence: writer,
    chainId: 4663,
    confirmations: 0,
    latestBlock: 100,
    fromBlock: 100,
    toBlock: 100,
    sourceId: SOURCE,
    acquiredAt: '2026-01-01T00:00:01.000Z',
  });

  assert.equal(
    dbRow(database, 'SELECT COUNT(*) AS count FROM canonical_block_decisions WHERE block_number = 100').count,
    2
  );

  const ancestor = findBranchCommonAncestor(database.db, {
    chainId: 4663,
    firstBlockHash: A,
    secondBlockHash: B,
  });

  assert.equal(ancestor.block_number, 99);
  assert.equal(ancestor.block_hash, C);

  database.close();
});

test('STEP 578 persisted snapshot survives reconstruction and corruption fails closed', async () => {
  const database = await createDatabase(':memory:');
  const writer = fence(tempDir());

  const result = await createCanonicalDecisionInput({
    provider: providerFor({ 99: header(99, P, ZERO), 100: header(100, A, P) }),
    db: database.db,
    writerFence: writer,
    chainId: 4663,
    confirmations: 0,
    latestBlock: 100,
    fromBlock: 100,
    toBlock: 100,
    sourceId: SOURCE,
    acquiredAt: '2026-01-01T00:00:00.000Z',
  });

  const recovered = reconstructSnapshot(database.db, result.snapshot_id);
  assert.equal(recovered.snapshot_id, result.snapshot_id);
  assert.equal(recovered.records.length, 1);

  database.db.run(
    'DELETE FROM canonical_block_decisions WHERE record_digest = ?',
    [result.records[0].record_digest]
  );

  assert.throws(
    () => reconstructSnapshot(database.db, result.snapshot_id),
    error => error.code === 'SNAPSHOT_MEMBER_MISSING'
  );

  database.close();
});

test('STEP 578 missing writer ownership fails closed before persistence', async () => {
  const database = await createDatabase(':memory:');
  const writer = createWriterFence({
    filename: path.join(tempDir(), 'writer-fence.json'),
    ownerId: 'writer-a',
    leaseMs: 60_000,
  });

  await assert.rejects(
    () => createCanonicalDecisionInput({
      provider: providerFor({ 99: header(99, P, ZERO), 100: header(100, A, P) }),
      db: database.db,
      writerFence: writer,
      chainId: 4663,
      confirmations: 0,
      latestBlock: 100,
      fromBlock: 100,
      toBlock: 100,
    }),
    error => error.code === 'WRITER_FENCE_MISSING'
  );

  database.close();
});

test('STEP 578 persistence failure rolls back canonical decision state', async () => {
  const database = await createDatabase(':memory:');
  const writer = fence(tempDir());
  const originalRun = database.db.run.bind(database.db);
  const failingDb = {
    prepare: database.db.prepare.bind(database.db),
    run(sql, params) {
      if (String(sql).includes('INSERT INTO canonical_block_decisions')) {
        throw new Error('injected persistence failure');
      }
      return originalRun(sql, params);
    },
  };

  await assert.rejects(
    () => createCanonicalDecisionInput({
      provider: providerFor({ 100: header(100, A, ZERO) }),
      db: failingDb,
      writerFence: writer,
      chainId: 4663,
      confirmations: 0,
      latestBlock: 100,
      fromBlock: 100,
      toBlock: 100,
      sourceId: SOURCE,
      acquiredAt: '2026-01-01T00:00:00.000Z',
    }),
    error => error.code === 'CBDR_PERSISTENCE_FAILURE'
  );

  assert.equal(
    dbRow(database, 'SELECT COUNT(*) AS count FROM canonical_block_decisions').count,
    0
  );

  database.close();
});

test('STEP 578 schema migrates v5 databases additively to v6', async () => {
  const filename = path.join(tempDir(), 'migration.sqlite');
  const database = await createDatabase(filename);
  database.db.run("UPDATE schema_meta SET value = '5' WHERE key = 'schema_version'");
  database.db.run('DROP TABLE canonical_decision_snapshot_blocks');
  database.db.run('DROP TABLE canonical_decision_snapshots');
  database.db.run('DROP TABLE canonical_block_decisions');
  database.save();
  database.db.close();

  const migrated = await createDatabase(filename);
  assert.equal(
    dbRow(migrated, "SELECT value AS value FROM schema_meta WHERE key = 'schema_version'").value,
    '6'
  );
  assert.equal(dbRow(migrated, 'SELECT COUNT(*) AS count FROM canonical_block_decisions').count, 0);
  assert.equal(dbRow(migrated, 'SELECT COUNT(*) AS count FROM raw_events').count, 0);
  migrated.close();
});
