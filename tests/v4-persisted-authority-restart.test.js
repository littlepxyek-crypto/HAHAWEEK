'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createDatabase } = require('../src/core/database');
const { insertManifest, loadManifest, insertCheckpoint, loadCheckpoint, loadAuthoritativeCursor } = require('../src/core/v4-production-authority-store');
const { createAuthorityRecord } = require('../src/core/v4-authority-record');
const { insertAuthorityRecord, loadAuthorityRecord } = require('../src/core/v4-authority-store');
const { expectedCheckpointHash, expectedCursorHash } = require('../src/core/v4-checkpoint-authority');
const { recoverPersistedAuthority } = require('../src/core/v4-production-recovery');

function fixture() {
  const manifest = { exists: true, hash: '0x' + 'c'.repeat(64), generation: '11', inventory_valid: true, segments_valid: true };
  const checkpointInput = { generation: '11', manifest_hash: manifest.hash };
  const checkpoint = { input: checkpointInput, hash: expectedCheckpointHash(checkpointInput) };
  const cursorInput = { generation: '11', checkpoint_hash: checkpoint.hash, position: '500' };
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

test('V4 persisted authority chain survives database restart and re-verifies from SQLite', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-v4-restart-'));
  const filename = path.join(dir, 'authority.sqlite');
  const f = fixture();

  const first = await createDatabase(filename);
  insertManifest(first, f.manifest);
  insertCheckpoint(first, f.checkpoint);
  insertAuthorityRecord(first, f.record);
  first.save();
  first.close();

  const second = await createDatabase(filename);
  assert.deepEqual(loadManifest(second, f.manifest.hash), f.manifest);
  assert.deepEqual(loadCheckpoint(second, f.checkpoint.hash), f.checkpoint);
  assert.deepEqual(loadAuthorityRecord(second, f.record.record_id), f.record);
  assert.equal(loadAuthoritativeCursor(second, f.cursor), true);
  const recovered = recoverPersistedAuthority(second);
  assert.deepEqual(recovered.record, f.record);
  assert.deepEqual(recovered.manifest, f.manifest);
  assert.deepEqual(recovered.checkpoint, f.checkpoint);
  assert.deepEqual(recovered.cursor, f.cursor);
  second.close();

  fs.rmSync(dir, { recursive: true, force: true });
});
