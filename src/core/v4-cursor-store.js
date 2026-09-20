'use strict';

const { assertAuthorityRecord } = require('./v4-authority-record');
const { insertAuthorityRecord } = require('./v4-authority-store');

function insertAuthorityAndCursorInTransaction(database, record, position, updatedAt = new Date().toISOString()) {
  assertAuthorityRecord(record);
  if (!Number.isInteger(position) || position < 0) throw new Error('CURSOR_POSITION_INVALID');
  if (record.cursor_input.position !== String(position)) throw new Error('CURSOR_POSITION_MISMATCH');
  insertAuthorityRecord(database, record, updatedAt);
  database.db.run(`INSERT INTO v4_cursor_state (singleton_key, generation, position, checkpoint_hash, cursor_hash, authority_record_id, updated_at) VALUES ('current', ?, ?, ?, ?, ?, ?)`, [record.cursor_input.generation, String(position), record.cursor_input.checkpoint_hash, record.cursor_hash, record.record_id, updatedAt]);
  return record.record_id;
}

function persistAuthorityAndCursor(database, record, position, updatedAt) {
  return database.transaction(() => insertAuthorityAndCursorInTransaction(database, record, position, updatedAt));
}

function loadCurrentCursor(database) {
  const result = database.db.exec("SELECT generation, position, checkpoint_hash, cursor_hash, authority_record_id, updated_at FROM v4_cursor_state WHERE singleton_key = 'current'");
  if (result.length === 0 || result[0].values.length === 0) return null;
  const row = result[0].values[0];
  return { generation: row[0], position: row[1], checkpoint_hash: row[2], cursor_hash: row[3], authority_record_id: row[4], updated_at: row[5] };
}

module.exports = { insertAuthorityAndCursorInTransaction, persistAuthorityAndCursor, loadCurrentCursor };