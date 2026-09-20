'use strict';

const { assertAuthorityRecord } = require('./v4-authority-record');

function encodeJson(value) { return JSON.stringify(value); }
function decodeJson(value) { try { return JSON.parse(value); } catch (_) { throw new Error('AUTHORITY_RECORD_STORAGE_CORRUPT'); } }

function insertAuthorityRecord(database, record, createdAt = new Date().toISOString()) {
  assertAuthorityRecord(record);
  database.db.run(`INSERT INTO v4_authority_records (record_id, schema_version, manifest_generation, manifest_hash, checkpoint_input_json, checkpoint_hash, cursor_input_json, cursor_hash, acquisition_position_valid, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [record.record_id, record.schema_version, record.manifest_generation, record.manifest_hash, encodeJson(record.checkpoint_input), record.checkpoint_hash, encodeJson(record.cursor_input), record.cursor_hash, record.acquisition_position_valid ? 1 : 0, createdAt]);
  return record.record_id;
}

function loadAuthorityRecord(database, recordId) {
  if (typeof recordId !== 'string' || recordId.length === 0) throw new Error('AUTHORITY_RECORD_ID_INVALID');
  const stmt = database.db.prepare('SELECT record_id, schema_version, manifest_generation, manifest_hash, checkpoint_input_json, checkpoint_hash, cursor_input_json, cursor_hash, acquisition_position_valid FROM v4_authority_records WHERE record_id = ?');
  try {
    stmt.bind([recordId]);
    if (!stmt.step()) return null;
    const row = stmt.getAsObject();
    const record = { record_id: row.record_id, schema_version: row.schema_version, manifest_generation: row.manifest_generation, manifest_hash: row.manifest_hash, checkpoint_input: decodeJson(row.checkpoint_input_json), checkpoint_hash: row.checkpoint_hash, cursor_input: decodeJson(row.cursor_input_json), cursor_hash: row.cursor_hash, acquisition_position_valid: row.acquisition_position_valid === 1 };
    assertAuthorityRecord(record);
    return record;
  } finally { stmt.free(); }
}

function loadLatestAuthorityRecord(database) {
  const result = database.db.exec('SELECT record_id FROM v4_authority_records ORDER BY rowid DESC LIMIT 1');
  if (result.length === 0 || result[0].values.length === 0) return null;
  return loadAuthorityRecord(database, result[0].values[0][0]);
}

function persistAuthorityRecord(database, record, createdAt) { return database.transaction(() => insertAuthorityRecord(database, record, createdAt)); }

module.exports = { insertAuthorityRecord, loadAuthorityRecord, loadLatestAuthorityRecord, persistAuthorityRecord };