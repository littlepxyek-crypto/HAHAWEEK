'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('../src/core/database');

function insertAuthority(database, id = 'r1') {
  database.db.run(`INSERT INTO v4_authority_records (record_id, schema_version, manifest_generation, manifest_hash, checkpoint_input_json, checkpoint_hash, cursor_input_json, cursor_hash, acquisition_position_valid, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, 1, '7', '0x' + 'a'.repeat(64), '{"generation":"7"}', '0x' + 'b'.repeat(64), '{"position":"101"}', '0x' + 'c'.repeat(64), 1, '2026-09-20T00:00:00.000Z']);
}

test('V4 authority table exists and transaction commits atomically', async () => {
  const database = await createDatabase(':memory:');
  database.transaction(() => insertAuthority(database));
  const rows = database.db.exec('SELECT record_id FROM v4_authority_records');
  assert.deepEqual(rows[0].values, [['r1']]);
  database.close();
});

test('V4 authority transaction rolls back on failure', async () => {
  const database = await createDatabase(':memory:');
  assert.throws(() => database.transaction(() => { insertAuthority(database, 'r2'); throw new Error('SIMULATED_COMMIT_FAILURE'); }), /SIMULATED_COMMIT_FAILURE/);
  const rows = database.db.exec('SELECT record_id FROM v4_authority_records');
  assert.equal(rows.length, 0);
  database.close();
});

test('V4 authority duplicate identity fails instead of replacing history', async () => {
  const database = await createDatabase(':memory:');
  insertAuthority(database, 'r3');
  assert.throws(() => database.transaction(() => insertAuthority(database, 'r3')), /UNIQUE constraint failed|constraint failed/i);
  const rows = database.db.exec('SELECT COUNT(*) FROM v4_authority_records WHERE record_id = \'r3\'');
  assert.equal(rows[0].values[0][0], 1);
  database.close();
});