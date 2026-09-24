'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createDatabase, SCHEMA_VERSION } = require('../src/core/database');
const { createCanonicalEvidence } = require('../src/core/canonical-evidence');
const { hashRawEvidence, hashCanonicalEvidence } = require('../src/core/evidence-identity');
const { createWriterFence } = require('../src/core/single-writer-fence');
const {
  persistProcessingResult,
  readProcessingResult,
  hashEvidenceSet,
} = require('../src/core/processing-result-persistence');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-step568-'));
}

function fixture() {
  const dir = tempDir();
  const databaseFile = path.join(dir, 'hahaweek.sqlite');
  const fenceFile = path.join(dir, 'writer-fence-state.json');
  return { dir, databaseFile, fenceFile };
}

function raw(id, block, txIndex, logIndex, byte) {
  return {
    event_id: id,
    chain_id: 4663,
    block_number: block,
    transaction_hash: '0x' + byte.repeat(64),
    block_hash: '0x' + String.fromCharCode(byte.charCodeAt(0) === 57 ? 56 : 57).repeat(64),
    transaction_index: txIndex,
    log_index: logIndex,
    address: '0x' + 'aa'.repeat(20),
    topics: [],
    data: '0x',
    captured_at: '2026-09-24T08:00:00.000Z',
  };
}

function seedEvidence(database, rawRecord) {
  const canonical = createCanonicalEvidence(rawRecord);
  database.db.run(
    'INSERT INTO raw_events (event_id, chain_id, block_number, transaction_hash, block_hash, transaction_index, log_index, address, topics_json, data, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      rawRecord.event_id, rawRecord.chain_id, rawRecord.block_number,
      rawRecord.transaction_hash, rawRecord.block_hash, rawRecord.transaction_index,
      rawRecord.log_index, rawRecord.address, JSON.stringify(rawRecord.topics),
      rawRecord.data, rawRecord.captured_at,
    ]
  );
  database.db.run(
    'INSERT INTO canonical_evidence (evidence_id, identity_schema_version, identity_hash, raw_event_id, raw_hash, canonical_hash, canonical_json, interpretation_status, provenance_json, stored_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      canonical.evidence_id,
      canonical.identity_reference.identity_schema_version,
      canonical.identity_reference.identity_hash,
      rawRecord.event_id,
      hashRawEvidence(rawRecord),
      hashCanonicalEvidence(canonical),
      JSON.stringify(canonical),
      canonical.interpretation_status,
      JSON.stringify({ raw_event_id: rawRecord.event_id, chain_id: rawRecord.chain_id }),
      rawRecord.captured_at,
    ]
  );
  return canonical.evidence_id;
}

function result(ids, overrides = {}) {
  return {
    resultId: 'pr:v1:step568',
    processingExecutionId: 'exec:v1:step568',
    parentResultId: null,
    transitionType: 'INITIAL',
    fromBlock: 100,
    toBlock: 101,
    generation: '7',
    status: 'ACCEPTED',
    canonicalityStatus: 'CANONICAL',
    emptyResult: ids.length === 0,
    canonicalEvidenceIds: ids,
    committedAt: '2026-09-24T08:01:00.000Z',
    provenance: { contract: 'STEP-568', execution: 'exec:v1:step568' },
    ...overrides,
  };
}

function writerFence(file) {
  const fence = createWriterFence({
    filename: file,
    ownerId: 'step568-test-owner',
    now: () => 1000,
    leaseMs: 10000,
  });
  fence.acquire();
  return fence;
}

test('fresh database is schema v7 and preserves F-03 tables', async () => {
  const f = fixture();
  const db = await createDatabase(f.databaseFile);
  assert.equal(SCHEMA_VERSION, 7);
  assert.equal(db.db.exec("SELECT value FROM schema_meta WHERE key='schema_version'")[0].values[0][0], '7');
  assert.equal(db.db.exec("SELECT name FROM sqlite_master WHERE name='f03_segments'")[0].values.length, 1);
  assert.equal(db.db.exec("SELECT name FROM sqlite_master WHERE name='processing_results'")[0].values.length, 1);
  assert.equal(db.db.exec("SELECT name FROM sqlite_master WHERE name='processing_result_evidence'")[0].values.length, 1);
  db.close();
});

test('v4 database migrates additively through v7', async () => {
  const f = fixture();
  const db = await createDatabase(f.databaseFile);
  db.db.run("DROP TABLE canonical_decision_snapshot_blocks");
  db.db.run("DROP TABLE canonical_decision_snapshots");
  db.db.run("DROP TABLE canonical_block_decisions");
  db.db.run("DROP TABLE processing_result_evidence");
  db.db.run("DROP TABLE processing_results");
  db.db.run('DROP TRIGGER canonical_transitions_no_update');
  db.db.run('DROP TRIGGER canonical_transitions_no_delete');
  db.db.run('DROP TRIGGER canonical_lineage_no_update');
  db.db.run('DROP TRIGGER canonical_lineage_no_delete');
  db.db.run('DROP TABLE canonical_lineage');
  db.db.run('DROP TABLE canonical_transitions');
  db.db.run("UPDATE schema_meta SET value='4' WHERE key='schema_version'");
  db.save();
  db.close();

  const migrated = await createDatabase(f.databaseFile);
  assert.equal(migrated.db.exec("SELECT value FROM schema_meta WHERE key='schema_version'")[0].values[0][0], '7');
  assert.equal(migrated.db.exec("SELECT name FROM sqlite_master WHERE name='f03_segments'")[0].values.length, 1);
  assert.equal(migrated.db.exec("SELECT name FROM sqlite_master WHERE name='f03_manifests'")[0].values.length, 1);
  assert.equal(migrated.db.exec("SELECT name FROM sqlite_master WHERE name='f03_checkpoints'")[0].values.length, 1);
  migrated.close();
});

test('processing result persists deterministically and survives restart', async () => {
  const f = fixture();
  let db = await createDatabase(f.databaseFile);
  const a = seedEvidence(db, raw('raw-a', 100, 0, 0, '1'));
  const b = seedEvidence(db, raw('raw-b', 101, 1, 0, '2'));
  const fence = writerFence(f.fenceFile);

  const first = await persistProcessingResult({
    database: db,
    processingResult: result([a, b]),
    writerFence: fence,
  });
  assert.equal(first.status, 'VERIFIED');
  assert.deepEqual(first.canonicalEvidenceIds, [a, b]);
  const digest = db.db.exec('SELECT evidence_set_digest FROM processing_results')[0].values[0][0];
  assert.equal(digest, hashEvidenceSet({
    resultId: 'pr:v1:step568',
    fromBlock: 100,
    toBlock: 101,
    generation: '7',
  }, [
    { ordinal: 0, evidence_id: a, raw_event_id: 'raw-a', identity_hash: first.provenance.identity_hash ?? db.db.exec('SELECT identity_hash FROM processing_result_evidence WHERE evidence_id=?',[a])[0].values[0][0], raw_hash: db.db.exec('SELECT raw_hash FROM processing_result_evidence WHERE evidence_id=?',[a])[0].values[0][0], canonical_hash: db.db.exec('SELECT canonical_hash FROM processing_result_evidence WHERE evidence_id=?',[a])[0].values[0][0], block_number: 100, transaction_index: 0, log_index: 0 },
    { ordinal: 1, evidence_id: b, raw_event_id: 'raw-b', identity_hash: db.db.exec('SELECT identity_hash FROM processing_result_evidence WHERE evidence_id=?',[b])[0].values[0][0], raw_hash: db.db.exec('SELECT raw_hash FROM processing_result_evidence WHERE evidence_id=?',[b])[0].values[0][0], canonical_hash: db.db.exec('SELECT canonical_hash FROM processing_result_evidence WHERE evidence_id=?',[b])[0].values[0][0], block_number: 101, transaction_index: 1, log_index: 0 },
  ]));
  db.close();

  db = await createDatabase(f.databaseFile);
  const recovered = readProcessingResult(db, 'pr:v1:step568');
  assert.equal(recovered.status, 'VERIFIED');
  assert.deepEqual(recovered.canonicalEvidenceIds, [a, b]);
  db.close();
});

test('identical replay is idempotent and conflicting replay fails closed', async () => {
  const f = fixture();
  const db = await createDatabase(f.databaseFile);
  const a = seedEvidence(db, raw('raw-a', 100, 0, 0, '1'));
  const fence = writerFence(f.fenceFile);
  const input = result([a]);
  const first = persistProcessingResult({ database: db, processingResult: input, writerFence: fence });
  const second = persistProcessingResult({ database: db, processingResult: input, writerFence: fence });
  assert.deepEqual(second, first);
  assert.throws(
    () => persistProcessingResult({
      database: db,
      processingResult: { ...input, generation: '8' },
      writerFence: fence,
    }),
    /PROCESSING_RESULT_INTEGRITY_CONFLICT/
  );
  db.close();
});

test('generation is never manufactured and writer ownership is mandatory', async () => {
  const f = fixture();
  const db = await createDatabase(f.databaseFile);
  const a = seedEvidence(db, raw('raw-a', 100, 0, 0, '1'));
  assert.throws(
    () => persistProcessingResult({ database: db, processingResult: result([a]) }),
    /PROCESSING_RESULT_WRITER_FENCE_REQUIRED/
  );
  assert.throws(
    () => persistProcessingResult({
      database: db,
      processingResult: result([a], { generation: '08' }),
      writerFence: writerFence(f.fenceFile),
    }),
    /PROCESSING_RESULT_GENERATION_INVALID/
  );
  db.close();
});

test('reorg replacement preserves old result and requires new generation', async () => {
  const f = fixture();
  const db = await createDatabase(f.databaseFile);
  const a = seedEvidence(db, raw('raw-a', 100, 0, 0, '1'));
  const b = seedEvidence(db, raw('raw-b', 100, 0, 0, '2'));
  const fence = writerFence(f.fenceFile);
  persistProcessingResult({ database: db, processingResult: result([a]), writerFence: fence });
  const replacement = result([b], {
    resultId: 'pr:v1:replacement',
    processingExecutionId: 'exec:v1:replacement',
    transitionType: 'REORG_REPLACEMENT',
    parentResultId: 'pr:v1:step568',
    generation: '8',
  });
  const stored = persistProcessingResult({ database: db, processingResult: replacement, writerFence: fence });
  assert.equal(stored.generation, '8');
  assert.equal(db.db.exec('SELECT COUNT(*) FROM processing_results')[0].values[0][0], 2);
  db.close();
});

test('empty result is explicit and deterministic', async () => {
  const f = fixture();
  const db = await createDatabase(f.databaseFile);
  const fence = writerFence(f.fenceFile);
  const stored = persistProcessingResult({
    database: db,
    processingResult: result([], { resultId: 'pr:v1:empty', processingExecutionId: 'exec:v1:empty', emptyResult: true }),
    writerFence: fence,
  });
  assert.equal(stored.emptyResult, true);
  assert.deepEqual(stored.canonicalEvidenceIds, []);
  db.close();
});

test('save failure restores the pre-transaction database state', async () => {
  const f = fixture();
  const db = await createDatabase(f.databaseFile);
  const a = seedEvidence(db, raw('raw-a', 100, 0, 0, '1'));
  const fence = writerFence(f.fenceFile);
  const originalSave = db.save;
  db.save = () => { throw new Error('SIMULATED_SAVE_FAILURE'); };
  assert.throws(
    () => persistProcessingResult({ database: db, processingResult: result([a]), writerFence: fence }),
    /SIMULATED_SAVE_FAILURE/
  );
  db.save = originalSave;
  assert.equal(db.db.exec('SELECT COUNT(*) FROM processing_results')[0].values[0][0], 0);
  db.close();
});

test('reader detects tampered durable membership', async () => {
  const f = fixture();
  const db = await createDatabase(f.databaseFile);
  const a = seedEvidence(db, raw('raw-a', 100, 0, 0, '1'));
  const fence = writerFence(f.fenceFile);
  persistProcessingResult({ database: db, processingResult: result([a]), writerFence: fence });
  db.db.run("UPDATE processing_result_evidence SET transaction_index=99 WHERE result_id='pr:v1:step568'");
  assert.throws(() => readProcessingResult(db, 'pr:v1:step568'), /PROCESSING_RESULT_EVIDENCE_SET_DIGEST_MISMATCH/);
  db.close();
});
