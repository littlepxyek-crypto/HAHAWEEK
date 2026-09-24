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

test('F-03 fresh database is schema 5 with all authoritative-chain tables', async () => {
  const dir = tempDir();
  const { database, writerFence } = await createFileDatabase(dir);

  assert.equal(database.db.exec("SELECT value FROM schema_meta WHERE key = 'schema_version'")[0].values[0][0], '5');
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
  first.database.db.run("DROP TABLE processing_result_evidence");
  first.database.db.run("DROP TABLE processing_results");
  first.database.db.run("DROP TABLE f03_checkpoints");
  first.database.db.run("DROP TABLE f03_manifests");
  first.database.db.run("DROP TABLE f03_segments");
  first.database.db.run("UPDATE schema_meta SET value = '3' WHERE key = 'schema_version'");
  first.database.save();
  first.database.close();
  first.writerFence.release();

  const second = await createFileDatabase(dir);
  assert.equal(second.database.db.exec("SELECT value FROM schema_meta WHERE key = 'schema_version'")[0].values[0][0], '5');
  assert.equal(second.database.db.exec("SELECT event_id FROM raw_events WHERE event_id = 'legacy-1'")[0].values[0][0], 'legacy-1');

  second.database.close();
  second.writerFence.release();
});

test('F-03 unsupported schema versions fail closed', async () => {
  const dir = tempDir();
  const file = path.join(dir, 'unsupported.sqlite');
  const first = await createFileDatabase(dir, 'unsupported.sqlite');
  first.database.db.run("UPDATE schema_meta SET value = '6' WHERE key = 'schema_version'");
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

test('F-03 schema 5 missing required table fails closed', async () => {
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
  assert.equal(second.status, 'IDEMPOTENT');
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

  assert.throws(
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

  assert.throws(
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


test('F-03 read path is SELECT-only and non-mutating', async () => {
  const dir = tempDir();
  const { database, writerFence } = await createFileDatabase(dir);
  const fixture = chainFixture();
  commitF03AuthorityChain({ database, writerFence, ...fixture });

  const before = database.snapshot();
  const first = readF03AuthorityChain({ database, fromBlock: 100, toBlock: 109 });
  const second = readF03AuthorityChain({ database, fromBlock: 100, toBlock: 109 });

  assert.deepEqual(first, second);
  assert.deepEqual(database.snapshot(), before);

  database.close();
  writerFence.release();
});

test('F-03 restart after failed durable export has no durable authority', async () => {
  const dir = tempDir();
  const file = path.join(dir, 'failed-export.sqlite');
  const fixture = chainFixture();

  const first = await createFileDatabase(dir, 'failed-export.sqlite');
  first.database.save = () => {
    throw new Error('SIMULATED_DURABLE_SAVE_FAILURE');
  };

  assert.throws(
    () => commitF03AuthorityChain({
      database: first.database,
      writerFence: first.writerFence,
      ...fixture,
    }),
    /F03_DURABLE_SAVE_FAILED/
  );

  first.writerFence.release();

  const second = await createFileDatabase(dir, 'failed-export.sqlite');
  assert.throws(
    () => readF03AuthorityChain({ database: second.database, fromBlock: 100, toBlock: 109 }),
    /F03_CHAIN_NOT_FOUND/
  );

  second.database.close();
  second.writerFence.release();
});

test('F-03 ambiguous exact-range chains fail closed', async () => {
  const dir = tempDir();
  const { database, writerFence } = await createFileDatabase(dir);
  const first = chainFixture();
  const second = chainFixture();

  second.segment.segmentId = 'segment-2';
  second.manifest.manifestId = 'manifest-2';
  second.manifest.manifestDigest = 'c'.repeat(64);
  second.checkpoint.manifestDigest = second.manifest.manifestDigest;
  second.checkpoint.checkpointDigest = checkpointDigestFor(second.checkpoint.generation, second.checkpoint.manifestDigest);
  second.manifest.segmentId = second.segment.segmentId;
  second.checkpoint.manifestId = second.manifest.manifestId;
  second.segment.provenance = provenance({
    recordType: 'segment',
    recordId: second.segment.segmentId,
    table: 'f03_segments',
    key: second.segment.segmentId,
    artifactId: second.segment.segmentId,
    generation: second.segment.generation,
    integrityDigest: second.segment.segmentDigest,
    committedAt: second.segment.committedAt,
    fromBlock: 100,
    toBlock: 109,
  });
  second.manifest.provenance = provenance({
    recordType: 'manifest',
    recordId: second.manifest.manifestId,
    table: 'f03_manifests',
    key: second.manifest.manifestId,
    artifactId: second.manifest.manifestId,
    upstreamRecordId: second.segment.segmentId,
    generation: second.manifest.generation,
    integrityDigest: second.manifest.manifestDigest,
    committedAt: second.manifest.committedAt,
  });
  second.checkpoint.provenance = provenance({
    recordType: 'checkpoint',
    recordId: second.checkpoint.checkpointDigest,
    table: 'f03_checkpoints',
    key: second.checkpoint.checkpointDigest,
    artifactId: second.checkpoint.checkpointDigest,
    upstreamRecordId: second.manifest.manifestId,
    generation: second.checkpoint.generation,
    integrityDigest: second.checkpoint.checkpointDigest,
    committedAt: second.checkpoint.committedAt,
  });

  commitF03AuthorityChain({ database, writerFence, ...first });
  commitF03AuthorityChain({ database, writerFence, ...second });

  assert.throws(
    () => readF03AuthorityChain({ database, fromBlock: 100, toBlock: 109 }),
    /F03_CHAIN_AMBIGUOUS/
  );

  database.close();
  writerFence.release();
});

test('F-03 missing downstream links fail closed', async () => {
  const dir = tempDir();
  const { database, writerFence } = await createFileDatabase(dir);
  const fixture = chainFixture();
  commitF03AuthorityChain({ database, writerFence, ...fixture });

  database.db.run('DELETE FROM f03_checkpoints WHERE checkpoint_digest = ?', [fixture.checkpoint.checkpointDigest]);
  assert.throws(
    () => readF03AuthorityChain({ database, fromBlock: 100, toBlock: 109 }),
    /F03_CHECKPOINT_NOT_FOUND/
  );

  database.close();
  writerFence.release();
});

test('F-03 malformed provenance fails before authoritative write', async () => {
  const dir = tempDir();
  const { database, writerFence } = await createFileDatabase(dir);
  const fixture = chainFixture();
  delete fixture.segment.provenance.integrityDigest;

  assert.throws(
    () => commitF03AuthorityChain({ database, writerFence, ...fixture }),
    /F03_PROVENANCE_INTEGRITYDIGEST_MISSING/
  );

  assert.equal(database.db.exec('SELECT COUNT(*) FROM f03_segments')[0].values[0][0], 0);

  database.close();
  writerFence.release();
});

test('F-03 writer fence blocks a competing writer', async () => {
  const dir = tempDir();
  const first = createWriterFence({
    filename: path.join(dir, 'writer-fence-state.json'),
    ownerId: 'first',
  });
  const second = createWriterFence({
    filename: path.join(dir, 'writer-fence-state.json'),
    ownerId: 'second',
  });

  first.acquire();
  assert.throws(() => second.acquire(), /WRITER_FENCE_BUSY|WRITER_FENCE_HELD/);
  first.release();
});

test('F-03 chain commit never creates runtime cursor state', async () => {
  const dir = tempDir();
  const { database, writerFence } = await createFileDatabase(dir);
  const fixture = chainFixture();

  commitF03AuthorityChain({ database, writerFence, ...fixture });

  assert.equal(fs.existsSync(path.join(dir, 'state.json')), false);

  database.close();
  writerFence.release();
});
