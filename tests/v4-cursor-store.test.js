'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('../src/core/database');
const { createAuthorityRecord } = require('../src/core/v4-authority-record');
const { persistAuthorityAndCursor, loadCurrentCursor } = require('../src/core/v4-cursor-store');

function fixture(position = '101') {
  return createAuthorityRecord({
    manifestGeneration: '7', manifestHash: '0x' + 'a'.repeat(64),
    checkpointInput: { generation: '7', manifest_hash: '0x' + 'a'.repeat(64) },
    checkpointHash: '0x' + 'b'.repeat(64),
    cursorInput: { generation: '7', checkpoint_hash: '0x' + 'b'.repeat(64), position },
    cursorHash: '0x' + (position === '101' ? 'c' : 'd').repeat(64), acquisitionPositionValid: true,
  });
}

test('V4 authority and cursor commit atomically', async () => {
  const database = await createDatabase(':memory:');
  const record = fixture();
  persistAuthorityAndCursor(database, record, 101);
  assert.deepEqual(loadCurrentCursor(database), { generation:'7', position:'101', checkpoint_hash:record.cursor_input.checkpoint_hash, cursor_hash:record.cursor_hash, authority_record_id:record.record_id, updated_at: loadCurrentCursor(database).updated_at });
  database.close();
});

test('V4 authority/cursor rollback leaves no partial cursor state', async () => {
  const database = await createDatabase(':memory:');
  const record = fixture();
  assert.throws(() => database.transaction(() => {
    require('../src/core/v4-authority-store').insertAuthorityRecord(database, record);
    database.db.run("INSERT INTO v4_cursor_state (singleton_key, generation, position, checkpoint_hash, cursor_hash, authority_record_id, updated_at) VALUES ('current','7','101','x','y','z','now')");
    throw new Error('SIMULATED_CRASH');
  }), /SIMULATED_CRASH/);
  assert.equal(database.db.exec('SELECT COUNT(*) FROM v4_authority_records')[0].values[0][0], 0);
  assert.equal(database.db.exec('SELECT COUNT(*) FROM v4_cursor_state')[0].values[0][0], 0);
  database.close();
});

test('V4 cursor rejects position mismatch before transaction', async () => {
  const database = await createDatabase(':memory:');
  const record = fixture('101');
  assert.throws(() => persistAuthorityAndCursor(database, record, 102), /CURSOR_POSITION_MISMATCH/);
  assert.equal(database.db.exec('SELECT COUNT(*) FROM v4_authority_records')[0].values[0][0], 0);
  database.close();
});