'use strict';

const { assertCheckpointAuthority, assertCursorAuthority } = require('./v4-checkpoint-authority');

function encode(value) { return JSON.stringify(value); }
function decode(value, errorCode) { try { return JSON.parse(value); } catch (_) { throw new Error(errorCode); } }

function insertManifest(database, manifest, createdAt = new Date().toISOString()) {
  if (!manifest || typeof manifest !== 'object') throw new Error('MANIFEST_INVALID');
  for (const key of ['generation', 'hash', 'inventory_valid', 'segments_valid']) {
    if (!Object.prototype.hasOwnProperty.call(manifest, key)) throw new Error('MANIFEST_INVALID');
  }
  if (typeof manifest.generation !== 'string' || typeof manifest.hash !== 'string') throw new Error('MANIFEST_INVALID');
  database.db.run('INSERT INTO v4_manifests (manifest_hash, generation, inventory_valid, segments_valid, manifest_json, created_at) VALUES (?, ?, ?, ?, ?, ?)', [manifest.hash, manifest.generation, manifest.inventory_valid ? 1 : 0, manifest.segments_valid ? 1 : 0, encode(manifest), createdAt]);
  return manifest.hash;
}

function loadManifest(database, manifestHash) {
  if (typeof manifestHash !== 'string' || manifestHash.length === 0) throw new Error('MANIFEST_HASH_INVALID');
  const stmt = database.db.prepare('SELECT manifest_json FROM v4_manifests WHERE manifest_hash = ?');
  try { stmt.bind([manifestHash]); if (!stmt.step()) return null; return decode(stmt.getAsObject().manifest_json, 'MANIFEST_STORAGE_CORRUPT'); } finally { stmt.free(); }
}

function insertCheckpoint(database, checkpoint, createdAt = new Date().toISOString()) {
  if (!checkpoint || !checkpoint.input || typeof checkpoint.hash !== 'string') throw new Error('CHECKPOINT_INVALID');
  const manifest = loadManifest(database, checkpoint.input.manifest_hash);
  if (!manifest) throw new Error('CHECKPOINT_MANIFEST_MISSING');
  assertCheckpointAuthority(checkpoint, manifest);
  database.db.run('INSERT INTO v4_checkpoints (checkpoint_hash, generation, manifest_hash, checkpoint_input_json, created_at) VALUES (?, ?, ?, ?, ?)', [checkpoint.hash, checkpoint.input.generation, checkpoint.input.manifest_hash, encode(checkpoint.input), createdAt]);
  return checkpoint.hash;
}

function loadCheckpoint(database, checkpointHash) {
  if (typeof checkpointHash !== 'string' || checkpointHash.length === 0) throw new Error('CHECKPOINT_HASH_INVALID');
  const stmt = database.db.prepare('SELECT checkpoint_hash, manifest_hash, checkpoint_input_json FROM v4_checkpoints WHERE checkpoint_hash = ?');
  try {
    stmt.bind([checkpointHash]);
    if (!stmt.step()) return null;
    const row = stmt.getAsObject();
    const checkpoint = { hash: row.checkpoint_hash, input: decode(row.checkpoint_input_json, 'CHECKPOINT_STORAGE_CORRUPT') };
    const manifest = loadManifest(database, row.manifest_hash);
    if (!manifest) throw new Error('CHECKPOINT_MANIFEST_MISSING');
    assertCheckpointAuthority(checkpoint, manifest);
    return checkpoint;
  } finally { stmt.free(); }
}

function loadAuthoritativeCursor(database, cursor) {
  if (!cursor || !cursor.input || typeof cursor.input.checkpoint_hash !== 'string') throw new Error('CURSOR_AUTHORITY_INVALID');
  const checkpoint = loadCheckpoint(database, cursor.input.checkpoint_hash);
  if (!checkpoint) throw new Error('CURSOR_CHECKPOINT_MISSING');
  assertCursorAuthority(cursor, checkpoint);
  return true;
}

module.exports = { insertManifest, loadManifest, insertCheckpoint, loadCheckpoint, loadAuthoritativeCursor };