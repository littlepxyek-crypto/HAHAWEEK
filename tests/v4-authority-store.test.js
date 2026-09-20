'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('../src/core/database');
const { createAuthorityRecord } = require('../src/core/v4-authority-record');
const { loadAuthorityRecord, persistAuthorityRecord } = require('../src/core/v4-authority-store');

function fixture() {
  return createAuthorityRecord({
    manifestGeneration: '7',
    manifestHash: '0x' + 'a'.repeat(64),
    checkpointInput: { generation: '7', manifest_hash: '0x' + 'a'.repeat(64) },
    checkpointHash: '0x' + 'b'.repeat(64),
    cursorInput: { generation: '7', checkpoint_hash: '0x' + 'b'.repeat(64), position: '101' },
    cursorHash: '0x' + 'c'.repeat(64),
    acquisitionPositionValid: true,
  });
}

test('V4 authority store round-trips a validated record', async () => {
  const database = await createDatabase(':memory:');
  const record = fixture();
  persistAuthorityRecord(database, record, '2026-09-20T00:00:00.000Z');
  assert.deepEqual(loadAuthorityRecord(database, record.record_id), record);
  database.close();
});

test('V4 authority store rejects invalid records before persistence', async () => {
  const database = await createDatabase(':memory:');
  const record = fixture();
  record.cursor_hash = '0x' + 'd'.repeat(64);
  assert.throws(() => persistAuthorityRecord(database, record), /AUTHORITY_RECORD_INVALID/);
  const rows = database.db.exec('SELECT COUNT(*) FROM v4_authority_records');
  assert.equal(rows[0].values[0][0], 0);
  database.close();
});

test('V4 authority store preserves history on duplicate record identity', async () => {
  const database = await createDatabase(':memory:');
  const record = fixture();
  persistAuthorityRecord(database, record);
  assert.throws(() => persistAuthorityRecord(database, record), /UNIQUE constraint failed|constraint failed/i);
  const rows = database.db.exec('SELECT COUNT(*) FROM v4_authority_records');
  assert.equal(rows[0].values[0][0], 1);
  database.close();
});

test('V4 authority store returns null for unknown identity', async () => {
  const database = await createDatabase(':memory:');
  assert.equal(loadAuthorityRecord(database, 'missing'), null);
  database.close();
});