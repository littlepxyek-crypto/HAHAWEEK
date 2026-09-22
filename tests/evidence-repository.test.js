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

  assert.equal(version, '3');
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
