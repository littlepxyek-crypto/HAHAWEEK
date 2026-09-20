'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createDatabase } = require('../src/core/database');
const { insertManifest, insertCheckpoint } = require('../src/core/v4-production-authority-store');
const { insertAuthorityRecord } = require('../src/core/v4-authority-store');
const { createAuthorityRecord } = require('../src/core/v4-authority-record');
const { expectedCheckpointHash, expectedCursorHash } = require('../src/core/v4-checkpoint-authority');
const { recoverPersistedAuthority } = require('../src/core/v4-production-recovery');
const { createAuthorityRecord } = require('../src/core/v4-authority-record');
const { expectedCursorHash } = require('../src/core/v4-checkpoint-authority');

function fixture() {
  const manifest = { exists: true, hash: '0x' + 'd'.repeat(64), generation: '12', inventory_valid: true, segments_valid: true };
  const checkpointInput = { generation: '12', manifest_hash: manifest.hash };
  const checkpoint = { input: checkpointInput, hash: expectedCheckpointHash(checkpointInput) };
  const cursorInput = { generation: '12', checkpoint_hash: checkpoint.hash, position: '700' };
  const cursor = { input: cursorInput, hash: expectedCursorHash(cursorInput) };
  const record = createAuthorityRecord({
    manifestGeneration: manifest.generation,
    manifestHash: manifest.hash,
    checkpointInput,
    checkpointHash: checkpoint.hash,
    cursorInput,
    cursorHash: cursor.hash,
    acquisitionPositionValid: true,
  });
  return { manifest, checkpoint, cursor, record };
}

async function seeded() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-v4-failclosed-'));
  const filename = path.join(dir, 'authority.sqlite');
  const db = await createDatabase(filename);
  const f = fixture();
  insertManifest(db, f.manifest);
  insertCheckpoint(db, f.checkpoint);
  insertAuthorityRecord(db, f.record);
  db.save();
  db.close();
  return { dir, filename, f };
}

test('startup recovery fails closed when manifest is missing', async () => {
  const { dir, filename, f } = await seeded();
  const db = await createDatabase(filename);
  db.db.run('DELETE FROM v4_manifests');
  assert.throws(() => recoverPersistedAuthority(db), /V4_MANIFEST_MISSING/);
  db.close(); fs.rmSync(dir, { recursive: true, force: true });
});

test('startup recovery fails closed when checkpoint is missing', async () => {
  const { dir, filename, f } = await seeded();
  const db = await createDatabase(filename);
  db.db.run('DELETE FROM v4_checkpoints');
  assert.throws(() => recoverPersistedAuthority(db), /V4_CHECKPOINT_MISSING/);
  db.close(); fs.rmSync(dir, { recursive: true, force: true });
});

test('startup recovery fails closed when persisted authority record is malformed', async () => {
  const { dir, filename, f } = await seeded();
  const db = await createDatabase(filename);
  db.db.run('UPDATE v4_authority_records SET cursor_hash = ?', ['0x' + 'e'.repeat(64)]);
  assert.throws(() => recoverPersistedAuthority(db), /AUTHORITY_RECORD_INVALID/);
  db.close(); fs.rmSync(dir, { recursive: true, force: true });
});

test('startup recovery fails closed when cursor checkpoint binding is corrupted', async () => {
  const { dir, filename, f } = await seeded();
  const db = await createDatabase(filename);
  const bad = { ...f.record, cursor_input: { ...f.record.cursor_input, checkpoint_hash: '0x' + 'e'.repeat(64) } };
  db.db.run('UPDATE v4_authority_records SET cursor_input_json = ?', [JSON.stringify(bad.cursor_input)]);
  assert.throws(() => recoverPersistedAuthority(db), /CURSOR_AUTHORITY_INVALID/);
  db.close(); fs.rmSync(dir, { recursive: true, force: true });
});


test('startup recovery fails closed when persisted manifest identity is mutated', async () => {
  const { dir, filename, f } = await seeded();
  const db = await createDatabase(filename);
  const mutated = { ...f.manifest, hash: '0x' + 'f'.repeat(64) };
  db.db.run('UPDATE v4_manifests SET manifest_json = ? WHERE manifest_hash = ?', [JSON.stringify(mutated), f.manifest.hash]);
  assert.throws(() => recoverPersistedAuthority(db), /CHECKPOINT_AUTHORITY_INVALID/);
  db.close(); fs.rmSync(dir, { recursive: true, force: true });
});

test('startup recovery fails closed when persisted checkpoint hash is mutated', async () => {
  const { dir, filename, f } = await seeded();
  const db = await createDatabase(filename);
  db.db.run('UPDATE v4_checkpoints SET checkpoint_hash = ? WHERE checkpoint_hash = ?', ['0x' + 'f'.repeat(64), f.checkpoint.hash]);
  assert.throws(() => recoverPersistedAuthority(db), /CHECKPOINT_AUTHORITY_INVALID|CHECKPOINT_HASH_INVALID/);
  db.close(); fs.rmSync(dir, { recursive: true, force: true });
});

test('startup recovery fails closed when cursor generation exceeds checkpoint generation', async () => {
  const { dir, filename, f } = await seeded();
  const db = await createDatabase(filename);
  const cursorInput = { ...f.cursor.input, generation: '13' };
  const badRecord = createAuthorityRecord({
    manifestGeneration: f.manifest.generation,
    manifestHash: f.manifest.hash,
    checkpointInput: f.checkpoint.input,
    checkpointHash: f.checkpoint.hash,
    cursorInput,
    cursorHash: expectedCursorHash(cursorInput),
    acquisitionPositionValid: true,
  });
  insertAuthorityRecord(db, badRecord);
  assert.throws(() => recoverPersistedAuthority(db), /CURSOR_AUTHORITY_INVALID/);
  db.close(); fs.rmSync(dir, { recursive: true, force: true });
});
