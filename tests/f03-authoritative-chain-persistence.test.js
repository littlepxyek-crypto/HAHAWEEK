'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDatabase } = require('../src/core/database');
const { createLegacyWriteBarrier } = require('../src/core/legacy-write-freeze');
const { createWriterFence } = require('../src/core/single-writer-fence');
const {
  checkpointDigestFor,
  commitF03AuthorityChain,
  readF03AuthorityChain,
} = require('../src/core/f03-authoritative-chain-persistence');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-f03-'));
}

function makeAuthority(dir) {
  const writerFence = createWriterFence({
    filename: path.join(dir, 'writer-fence-state.json'),
    ownerId: 'test-writer',
  });
  writerFence.acquire();

  const barrier = createLegacyWriteBarrier({
    filename: path.join(dir, 'legacy-write-state.json'),
    writerFence,
  });

  return { writerFence, barrier };
}

function provenance({
  recordType,
  recordId,
  table,
  key,
  artifactId,
  upstreamRecordId,
  generation,
  integrityDigest,
  committedAt,
  fromBlock,
  toBlock,
}) {
  return {
    recordType,
    recordId,
    persistenceMechanism: 'sqlite',
    table,
    key,
    artifactId,
    ...(upstreamRecordId ? { upstreamRecordId } : {}),
    ...(fromBlock !== undefined ? { fromBlock } : {}),
    ...(toBlock !== undefined ? { toBlock } : {}),
    generation,
    integrityDigest,
    committedAt,
  };
}

function chainFixture() {
  const generation = '1';
  const committedAt = '2026-09-24T05:00:00.000Z';
  const segmentId = 'segment-1';
  const segmentDigest = 'a'.repeat(64);
  const manifestId = 'manifest-1';
  const manifestDigest = 'b'.repeat(64);
  const checkpointDigest = checkpointDigestFor(generation, manifestDigest);

  const segment = {
    segmentId,
    fromBlock: 100,
    toBlock: 109,
    segmentDigest,
    generation,
    committedAt,
    provenance: provenance({
      recordType: 'segment',
      recordId: segmentId,
      table: 'f03_segments',
      key: segmentId,
      artifactId: segmentId,
      generation,
      integrityDigest: segmentDigest,
      committedAt,
      fromBlock: 100,
      toBlock: 109,
    }),
  };

  const manifest = {
    manifestId,
    manifestDigest,
    generation,
    segmentId,
    segmentDigest,
    committedAt,
    provenance: provenance({
      recordType: 'manifest',
      recordId: manifestId,
      table: 'f03_manifests',
      key: manifestId,
      artifactId: manifestId,
      upstreamRecordId: segmentId,
      generation,
      integrityDigest: manifestDigest,
      committedAt,
    }),
  };

  const checkpoint = {
    checkpointDigest,
    generation,
    manifestId,
    manifestDigest,
    committedAt,
    provenance: provenance({
      recordType: 'checkpoint',
      recordId: checkpointDigest,
      table: 'f03_checkpoints',
      key: checkpointDigest,
      artifactId: checkpointDigest,
      upstreamRecordId: manifestId,
      generation,
      integrityDigest: checkpointDigest,
      committedAt,
    }),
  };

  return { segment, manifest, checkpoint };
}

async function createFileDatabase(dir, filename = 'hahaweek.sqlite') {
  const authority = makeAuthority(dir);
  const database = await createDatabase(path.join(dir, filename), {
    legacyWriteBarrier: authority.barrier,
  });
  return { ...authority, database };
}

test('F-03 fresh database is schema 4 with all authoritative-chain tables', async () => {
  const dir = tempDir();
  const { database, writerFence } = await createFileDatabase(dir);

  assert.equal(database.db.exec("SELECT value FROM schema_meta WHERE key = 'schema_version'")[0].values[0][0], '4');
  for (const table of ['f03_segments', 'f03_manifests', 'f03_checkpoints']) {
    assert.equal(database.db.exec(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      [table]
    )[0].values.length, 1);
  }

  database.close();
  writerFence.release();
});

test('F-03 schema 3 migrates in place and preserves existing rows', async () => {
  const dir = tempDir();
  const file = path.join(dir, 'hahaweek.sqlite');
  const first = await createFileDatabase(dir);

  first.database.db.run(
    "INSERT INTO raw_events (event_id, chain_id, block_number, transaction_hash, log_index, address, topics_json, data, captured_at) VALUES ('legacy-1', 4663, 100, '0xtx', 0, '0xpool', '[]', '0x', '2026-09-24T05:00:00.000Z')"
  );
  first.database.db.run("DROP TABLE f03_checkpoints");
  first.database.db.run("DROP TABLE f03_manifests");
  first.database.db.run("DROP TABLE f03_segments");
  first.database.db.run("UPDATE schema_meta SET value = '3' WHERE key = 'schema_version'");
  first.database.save();
  first.database.close();
  first.writerFence.release();

  const second = await createFileDatabase(dir);
  assert.equal(second.database.db.exec("SELECT value FROM schema_meta WHERE key = 'schema_version'")[0].values[0][0], '4');
  assert.equal(second.database.db.exec("SELECT event_id FROM raw_events WHERE event_id = 'legacy-1'")[0].values[0][0], 'legacy-1');

  second.database.close();
  second.writerFence.release();
});

test('F-03 unsupported schema versions fail closed', async () => {
  const dir = tempDir();
  const file = path.join(dir, 'unsupported.sqlite');
  const first = await createFileDatabase(dir, 'unsupported.sqlite');
  first.database.db.run("UPDATE schema_meta SET value = '5' WHERE key = 'schema_version'");
  first.database.save();
  first.database.close();
  first.writerFence.release();

  const authority = makeAuthority(dir);
  await assert.rejects(
    () => createDatabase(file, { legacyWriteBarrier: authority.barrier }),
    /UNSUPPORTED_SCHEMA_VERSION/
  );
  authority.writerFence.release();
});

test('F-03 schema 4 missing required table fails closed', async () => {
  const dir = tempDir();
  const file = path.join(dir, 'malformed.sqlite');
  const first = await createFileDatabase(dir, 'malformed.sqlite');
  first.database.db.run('DROP TABLE f03_checkpoints');
  first.database.save();
  first.database.close();
  first.writerFence.release();

  const authority = makeAuthority(dir);
  await assert.rejects(
    () => createDatabase(file, { legacyWriteBarrier: authority.barrier }),
    /F03_TABLE_MISSING_F03_CHECKPOINTS/
  );
  authority.writerFence.release();
});

test('F-03 commits a complete chain and derives cursorBlock from persisted segment.to_block', async () => {
  const dir = tempDir();
  const { database, writerFence } = await createFileDatabase(dir);
  const { segment, manifest, checkpoint } = chainFixture();

  const committed = commitF03AuthorityChain({
    database,
    writerFence,
    segment,
    manifest,
    checkpoint,
  });

  assert.equal(committed.status, 'COMMITTED');
  assert.equal(committed.cursorBlock, 109);

  const read = readF03AuthorityChain({
    database,
    fromBlock: 100,
    toBlock: 109,
  });

  assert.equal(read.status, 'VERIFIED');
  assert.equal(read.cursorBlock, 109);
  assert.equal(read.cursorBlock, read.toBlock);
  assert.equal(read.segmentId, segment.segmentId);
  assert.equal(read.manifestDigest, manifest.manifestDigest);
  assert.equal(read.checkpointDigest, checkpoint.checkpointDigest);

  database.close();
  writerFence.release();
});

test('F-03 identical retry is idempotent and does not duplicate rows', async () => {
  const dir = tempDir();
  const { database, writerFence } = await createFileDatabase(dir);
  const fixture = chainFixture();

  const first = commitF03AuthorityChain({
    database,
    writerFence,
    ...fixture,
  });
  const second = commitF03AuthorityChain({
    database,
    writerFence,
    ...fixture,
  });

  assert.equal(first.status, 'COMMITTED');
  assert.equal(second.status, 'COMMITTED');
  assert.equal(database.db.exec('SELECT COUNT(*) FROM f03_segments')[0].values[0][0], 1);
  assert.equal(database.db.exec('SELECT COUNT(*) FROM f03_manifests')[0].values[0][0], 1);
  assert.equal(database.db.exec('SELECT COUNT(*) FROM f03_checkpoints')[0].values[0][0], 1);

  database.close();
  writerFence.release();
});

test('F-03 identity conflict fails closed without replacement', async () => {
  const dir = tempDir();
  const { database, writerFence } = await createFileDatabase(dir);
  const fixture = chainFixture();

  commitF03AuthorityChain({ database, writerFence, ...fixture });

  const conflicting = {
    ...fixture,
    segment: {
      ...fixture.segment,
      toBlock: 110,
      provenance: provenance({
        recordType: 'segment',
        recordId: fixture.segment.segmentId,
        table: 'f03_segments',
        key: fixture.segment.segmentId,
        artifactId: fixture.segment.segmentId,
        generation: fixture.segment.generation,
        integrityDigest: fixture.segment.segmentDigest,
        committedAt: fixture.segment.committedAt,
        fromBlock: 100,
        toBlock: 110,
      }),
    },
  };

  await assert.rejects(
    () => commitF03AuthorityChain({ database, writerFence, ...conflicting }),
    /F03_INTEGRITY_CONFLICT/
  );

  assert.equal(database.db.exec(
    'SELECT to_block FROM f03_segments WHERE segment_id = ?',
    [fixture.segment.segmentId]
  )[0].values[0][0], 109);

  database.close();
  writerFence.release();
});

test('F-03 exact range mismatch fails closed', async () => {
  const dir = tempDir();
  const { database, writerFence } = await createFileDatabase(dir);
  const fixture = chainFixture();
  commitF03AuthorityChain({ database, writerFence, ...fixture });

  assert.throws(
    () => readF03AuthorityChain({ database, fromBlock: 100, toBlock: 110 }),
    /F03_CHAIN_NOT_FOUND/
  );

  database.close();
  writerFence.release();
});

test('F-03 restart preserves the durable chain and cursor boundary', async () => {
  const dir = tempDir();
  const fixture = chainFixture();

  const first = await createFileDatabase(dir);
  commitF03AuthorityChain({
    database: first.database,
    writerFence: first.writerFence,
    ...fixture,
  });
  first.database.close();
  first.writerFence.release();

  const second = await createFileDatabase(dir);
  const read = readF03AuthorityChain({
    database: second.database,
    fromBlock: 100,
    toBlock: 109,
  });

  assert.equal(read.cursorBlock, 109);
  assert.equal(read.checkpointDigest, fixture.checkpoint.checkpointDigest);

  second.database.close();
  second.writerFence.release();
});

test('F-03 failed durable save restores pre-commit in-memory state', async () => {
  const dir = tempDir();
  const { database, writerFence } = await createFileDatabase(dir);
  const fixture = chainFixture();

  database.save = () => {
    throw new Error('SIMULATED_DURABLE_SAVE_FAILURE');
  };

  await assert.rejects(
    () => commitF03AuthorityChain({
      database,
      writerFence,
      ...fixture,
    }),
    /F03_DURABLE_SAVE_FAILED/
  );

  assert.equal(database.db.exec('SELECT COUNT(*) FROM f03_segments')[0].values[0][0], 0);
  assert.throws(
    () => readF03AuthorityChain({ database, fromBlock: 100, toBlock: 109 }),
    /F03_CHAIN_NOT_FOUND/
  );

  writerFence.release();
});

test('F-03 submitted authority cannot manufacture expected cursor boundary', async () => {
  const dir = tempDir();
  const { database, writerFence } = await createFileDatabase(dir);

  assert.throws(
    () => readF03AuthorityChain({ database, fromBlock: 100, toBlock: 109 }),
    /F03_CHAIN_NOT_FOUND/
  );

  assert.equal(database.db.exec('SELECT COUNT(*) FROM f03_segments')[0].values[0][0], 0);

  database.close();
  writerFence.release();
});
