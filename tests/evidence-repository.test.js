'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('../src/core/database');
const { createRawEventStore } = require('../src/core/raw-event-store');
const { createCanonicalEvidence } = require('../src/core/canonical-evidence');
const { createEvidenceRepository } = require('../src/core/evidence-repository');

function raw() {
  return {
    event_id: '4663:123:0x' + 'b'.repeat(64) + ':7',
    chain_id: 4663,
    block_number: 123,
    block_hash: '0x' + 'a'.repeat(64),
    transaction_hash: '0x' + 'b'.repeat(64),
    transaction_index: 4,
    log_index: 7,
    address: '0x' + 'c'.repeat(40),
    topics: ['0x' + 'd'.repeat(64)],
    data: '0xdeadbeef',
    captured_at: '2026-01-01T00:00:00.000Z',
  };
}

test('repository stores canonical evidence only after raw evidence exists', async () => {
  const database = await createDatabase(':memory:');
  const rawStore = createRawEventStore(database.db);
  const repository = createEvidenceRepository(database.db);
  const source = raw();
  const canonical = createCanonicalEvidence(source);

  assert.throws(
    () => repository.insert(source, canonical),
    /RAW_EVIDENCE_NOT_STORED/
  );

  rawStore.insert(source);
  const result = repository.insert(source, canonical);

  assert.equal(result.inserted, true);
  assert.equal(result.evidenceId, canonical.evidence_id);
  assert.equal(repository.count(), 1);
  assert.equal(repository.get(canonical.evidence_id).canonical.evidence_id, canonical.evidence_id);
  database.close();
});

test('repository insertion is idempotent for identical evidence', async () => {
  const database = await createDatabase(':memory:');
  const rawStore = createRawEventStore(database.db);
  const repository = createEvidenceRepository(database.db);
  const source = raw();
  const canonical = createCanonicalEvidence(source);

  rawStore.insert(source);
  const first = repository.insert(source, canonical);
  const second = repository.insert(source, canonical);

  assert.equal(first.inserted, true);
  assert.equal(second.inserted, false);
  assert.equal(second.evidenceId, first.evidenceId);
  assert.equal(repository.count(), 1);
  database.close();
});

test('repository rejects conflicting content for the same evidence identity', async () => {
  const database = await createDatabase(':memory:');
  const rawStore = createRawEventStore(database.db);
  const repository = createEvidenceRepository(database.db);
  const source = raw();
  const canonical = createCanonicalEvidence(source);

  rawStore.insert(source);
  repository.insert(source, canonical);

  const conflicting = { ...canonical, data: '0xcafebabe' };

  assert.throws(
    () => repository.insert(source, conflicting),
    /EVIDENCE_CONFLICT/
  );
  assert.equal(repository.count(), 1);
  database.close();
});

test('schema version is upgraded to repository version', async () => {
  const database = await createDatabase(':memory:');
  const version = database.db.exec(
    "SELECT value FROM schema_meta WHERE key = 'schema_version'"
  )[0].values[0][0];

  assert.equal(version, '6');
  const columns = database.db.exec(
    'PRAGMA table_info(canonical_evidence)'
  )[0].values.map(row => row[1]);

  assert.deepEqual(columns, [
    'evidence_id',
    'identity_schema_version',
    'identity_hash',
    'raw_event_id',
    'raw_hash',
    'canonical_hash',
    'canonical_json',
    'interpretation_status',
    'provenance_json',
    'stored_at',
  ]);
  database.close();
});

test('repository verifies hashes and identity after database restart', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');

  const filename = path.join(
    os.tmpdir(),
    `hahaweek-evidence-${process.pid}-${Date.now()}.sqlite`
  );

  try {
    const first = await createDatabase(filename);
    const rawStore = createRawEventStore(first.db);
    const repository = createEvidenceRepository(first.db);
    const source = raw();
    const canonical = createCanonicalEvidence(source);

    rawStore.insert(source);
    const inserted = repository.insert(source, canonical);
    assert.equal(inserted.inserted, true);
    assert.equal(repository.verify(canonical.evidence_id).verified, true);
    first.close();

    const second = await createDatabase(filename);
    const restored = createEvidenceRepository(second.db);
    const verification = restored.verify(canonical.evidence_id);

    assert.equal(restored.count(), 1);
    assert.equal(verification.verified, true);
    assert.equal(verification.evidenceId, canonical.evidence_id);
    assert.equal(verification.rawHash, inserted.rawHash);
    assert.equal(verification.canonicalHash, inserted.canonicalHash);
    second.close();
  } finally {
    if (fs.existsSync(filename)) fs.unlinkSync(filename);
  }
});

test('repository detects raw evidence tampering', async () => {
  const database = await createDatabase(':memory:');
  const rawStore = createRawEventStore(database.db);
  const repository = createEvidenceRepository(database.db);
  const source = raw();
  const canonical = createCanonicalEvidence(source);

  rawStore.insert(source);
  repository.insert(source, canonical);

  database.db.run(
    'UPDATE raw_events SET data = ? WHERE event_id = ?',
    ['0xcafebabe', source.event_id]
  );

  const verification = repository.verify(canonical.evidence_id);
  assert.equal(verification.verified, false);
  assert.equal(verification.reason, 'RAW_HASH_MISMATCH');
  database.close();
});

test('repository detects canonical evidence tampering', async () => {
  const database = await createDatabase(':memory:');
  const rawStore = createRawEventStore(database.db);
  const repository = createEvidenceRepository(database.db);
  const source = raw();
  const canonical = createCanonicalEvidence(source);

  rawStore.insert(source);
  repository.insert(source, canonical);

  const tamperedCanonical = { ...canonical, data: '0xcafebabe' };
  database.db.run(
    'UPDATE canonical_evidence SET canonical_json = ? WHERE evidence_id = ?',
    [JSON.stringify(tamperedCanonical), canonical.evidence_id]
  );

  const verification = repository.verify(canonical.evidence_id);
  assert.equal(verification.verified, false);
  assert.equal(verification.reason, 'CANONICAL_HASH_MISMATCH');
  database.close();
});
