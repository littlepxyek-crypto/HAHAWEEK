'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const initSqlJs = require('sql.js');

const { createDatabase } = require('../src/core/database');
const { createLegacyWriteBarrier } = require('../src/core/legacy-write-freeze');
const { createWriterFence } = require('../src/core/single-writer-fence');
const {
  checkpointDigestFor,
  commitF03AuthorityChain,
  readF03AuthorityChain,
} = require('../src/core/f03-authoritative-chain-persistence');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-f03-ext-'));
}

function authority(dir) {
  const writerFence = createWriterFence({
    filename: path.join(dir, 'writer-fence.json'),
    ownerId: 'extended-test',
  });
  writerFence.acquire();
  const barrier = createLegacyWriteBarrier({
    filename: path.join(dir, 'legacy-state.json'),
    writerFence,
  });
  return { writerFence, barrier };
}

function fixture(overrides = {}) {
  const generation = '1';
  const committedAt = '2026-09-24T05:00:00.000Z';
  const segmentId = overrides.segmentId || 'segment-ext';
  const segmentDigest = overrides.segmentDigest || 'a'.repeat(64);
  const manifestId = overrides.manifestId || 'manifest-ext';
  const manifestDigest = overrides.manifestDigest || 'b'.repeat(64);
  const checkpointDigest = checkpointDigestFor(generation, manifestDigest);

  const provenance = (recordType, recordId, table, key, artifactId, integrityDigest, extra = {}, upstreamRecordId) => ({
    recordType,
    recordId,
    persistenceMechanism: 'sqlite',
    table,
    key,
    artifactId,
    ...(upstreamRecordId ? { upstreamRecordId } : {}),
    ...extra,
    generation,
    integrityDigest,
    committedAt,
  });

  const segment = {
    segmentId,
    fromBlock: 300,
    toBlock: 309,
    segmentDigest,
    generation,
    committedAt,
    provenance: provenance('segment', segmentId, 'f03_segments', segmentId, segmentId, segmentDigest, { fromBlock: 300, toBlock: 309 }),
  };

  const manifest = {
    manifestId,
    manifestDigest,
    generation,
    segmentId,
    segmentDigest,
    committedAt,
    provenance: provenance('manifest', manifestId, 'f03_manifests', manifestId, manifestId, manifestDigest, {}, segmentId),
  };

  const checkpoint = {
    checkpointDigest,
    generation,
    manifestId,
    manifestDigest,
    committedAt,
    provenance: provenance('checkpoint', checkpointDigest, 'f03_checkpoints', checkpointDigest, checkpointDigest, checkpointDigest, {}, manifestId),
  };

  return { segment, manifest, checkpoint };
}

async function databaseAt(dir, name = 'hahaweek.sqlite') {
  const a = authority(dir);
  const database = await createDatabase(path.join(dir, name), {
    legacyWriteBarrier: a.barrier,
  });
  return { ...a, database };
}

test('F-03 invalid range and invalid digest fail closed before mutation', async () => {
  const dir = tempDir();
  const { database, writerFence } = await databaseAt(dir);
  const f = fixture();

  assert.throws(
    () => readF03AuthorityChain({ database, fromBlock: 310, toBlock: 309 }),
    /F03_RANGE_INVALID/
  );

  assert.throws(
    () => commitF03AuthorityChain({
      database,
      writerFence,
      ...fixture({ segmentDigest: 'Z'.repeat(64) }),
    }),
    /F03_SEGMENT_DIGEST_INVALID/
  );

  assert.equal(database.db.exec('SELECT COUNT(*) FROM f03_segments')[0].values[0][0], 0);
  assert.equal(f.segment.toBlock, 309);

  database.close();
  writerFence.release();
});

test('F-03 generation and linkage conflicts fail closed', async () => {
  const dir = tempDir();
  const { database, writerFence } = await databaseAt(dir);
  const f = fixture();

  const generationConflict = fixture();
  generationConflict.manifest.generation = '2';
  generationConflict.manifest.provenance.generation = '2';

  assert.throws(
    () => commitF03AuthorityChain({ database, writerFence, ...generationConflict }),
    /F03_GENERATION_MISMATCH/
  );

  const linkageConflict = fixture();
  linkageConflict.manifest.segmentId = 'other-segment';
  linkageConflict.manifest.provenance.upstreamRecordId = 'other-segment';

  assert.throws(
    () => commitF03AuthorityChain({ database, writerFence, ...linkageConflict }),
    /F03_MANIFEST_SEGMENT_MISMATCH/
  );

  database.close();
  writerFence.release();
});

test('F-03 failed transaction and restart leave no authoritative chain', async () => {
  const dir = tempDir();
  const { database, writerFence } = await databaseAt(dir);
  const f = fixture();

  const invalidCheckpoint = {
    ...f.checkpoint,
    manifestDigest: 'Z'.repeat(64),
  };

  assert.throws(
    () => commitF03AuthorityChain({
      database,
      writerFence,
      segment: f.segment,
      manifest: f.manifest,
      checkpoint: invalidCheckpoint,
    }),
    /F03_CHECKPOINT_MANIFEST_DIGEST_INVALID/
  );

  assert.equal(database.db.exec('SELECT COUNT(*) FROM f03_segments')[0].values[0][0], 0);
  database.close();
  writerFence.release();

  const restart = await databaseAt(dir);
  assert.throws(
    () => readF03AuthorityChain({ database: restart.database, fromBlock: 300, toBlock: 309 }),
    /F03_CHAIN_NOT_FOUND/
  );
  restart.database.close();
  restart.writerFence.release();
});

test('F-03 missing segment fails closed', async () => {
  const dir = tempDir();
  const { database, writerFence } = await databaseAt(dir);
  const f = fixture();
  commitF03AuthorityChain({ database, writerFence, ...f });

  database.db.run('DELETE FROM f03_checkpoints');
  database.db.run('DELETE FROM f03_manifests');
  database.db.run('DELETE FROM f03_segments');

  assert.throws(
    () => readF03AuthorityChain({ database, fromBlock: 300, toBlock: 309 }),
    /F03_CHAIN_NOT_FOUND/
  );

  database.close();
  writerFence.release();
});

test('F-03 schema 3 migration rolls back on table-creation conflict', async () => {
  const dir = tempDir();
  const file = path.join(dir, 'migration-rollback.sqlite');
  const first = await databaseAt(dir, 'migration-rollback.sqlite');

  first.database.db.run('DROP TABLE f03_checkpoints');
  first.database.db.run('DROP TABLE f03_manifests');
  first.database.db.run("UPDATE schema_meta SET value = '3' WHERE key = 'schema_version'");
  first.database.save();
  first.database.close();
  first.writerFence.release();

  const a = authority(dir);
  await assert.rejects(
    () => createDatabase(file, { legacyWriteBarrier: a.barrier }),
    /F03_TABLE_MISSING|already exists|SQLITE/
  );
  a.writerFence.release();

  const SQL = await initSqlJs({
    locateFile: fileName => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', fileName),
  });
  const raw = new SQL.Database(new Uint8Array(fs.readFileSync(file)));
  const version = raw.exec("SELECT value FROM schema_meta WHERE key = 'schema_version'")[0].values[0][0];
  assert.equal(version, '3');
  raw.close();
});
