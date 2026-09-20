'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createDatabase } = require('../src/core/database');
const { insertManifest, insertCheckpoint } = require('../src/core/v4-production-authority-store');
const { createAuthorityRecord } = require('../src/core/v4-authority-record');
const { insertAuthorityRecord } = require('../src/core/v4-authority-store');
const { expectedCheckpointHash, expectedCursorHash } = require('../src/core/v4-checkpoint-authority');
const { createV4ProductionCursor, createV4ProductionIngestionEngine } = require('../src/core/v4-production-engine-seam');

function fixture() {
  const manifest = { exists: true, hash: '0x' + 'e'.repeat(64), generation: '21', inventory_valid: true, segments_valid: true };
  const checkpointInput = { generation: '21', manifest_hash: manifest.hash };
  const checkpoint = { input: checkpointInput, hash: expectedCheckpointHash(checkpointInput) };
  const cursorInput = { generation: '21', checkpoint_hash: checkpoint.hash, position: '900' };
  const cursorHash = expectedCursorHash(cursorInput);
  const record = createAuthorityRecord({
    manifestGeneration: manifest.generation,
    manifestHash: manifest.hash,
    checkpointInput,
    checkpointHash: checkpoint.hash,
    cursorInput,
    cursorHash,
    acquisitionPositionValid: true,
  });
  return { manifest, checkpoint, record };
}

test('V4 production startup seam constructs cursor only from persisted authority chain', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-v4-seam-'));
  const filename = path.join(dir, 'authority.sqlite');
  const f = fixture();
  const db = await createDatabase(filename);
  insertManifest(db, f.manifest);
  insertCheckpoint(db, f.checkpoint);
  insertAuthorityRecord(db, f.record);
  db.save();

  const result = createV4ProductionCursor({ database: db });
  assert.equal(result.cursor.get(), 900);
  assert.equal(result.recovered.record.record_id, f.record.record_id);

  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('V4 production startup seam fails closed when persisted authority is absent', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-v4-seam-missing-'));
  const filename = path.join(dir, 'authority.sqlite');
  const db = await createDatabase(filename);

  assert.throws(() => createV4ProductionCursor({ database: db }), /V4_AUTHORITY_RECORD_MISSING/);

  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('V4 production ingestion engine seam binds persisted authority cursor explicitly', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-v4-engine-seam-'));
  const filename = path.join(dir, 'authority.sqlite');
  const f = fixture();
  const db = await createDatabase(filename);
  insertManifest(db, f.manifest);
  insertCheckpoint(db, f.checkpoint);
  insertAuthorityRecord(db, f.record);
  db.save();

  let processed = 0;
  const engine = createV4ProductionIngestionEngine({
    database: db,
    provider: { async getBlockNumber() { return 900; } },
    confirmations: 0,
    processor: async () => { processed += 1; },
  });

  assert.equal(engine.getActiveCursor().get(), 900);
  assert.equal(engine.v4CursorAdapter.get(), 900);
  assert.equal(processed, 0);

  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('V4 production ingestion seam restarts from the last durable authority cursor', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-v4-engine-restart-'));
  const filename = path.join(dir, 'authority.sqlite');
  const f = fixture();

  const first = await createDatabase(filename);
  insertManifest(first, f.manifest);
  insertCheckpoint(first, f.checkpoint);
  insertAuthorityRecord(first, f.record);
  first.save();

  const seenFirst = [];
  const engine1 = createV4ProductionIngestionEngine({
    database: first,
    provider: { async getBlockNumber() { return 901; } },
    confirmations: 0,
    processor: async block => {
      seenFirst.push(block);
      first.db.run('INSERT INTO raw_events(event_id,chain_id,block_number,transaction_hash,log_index,address,topics_json,data,captured_at) VALUES(?,?,?,?,?,?,?,?,?)', ['restart-' + block, 4663, block, '0x' + String(block).padStart(64, '0'), 0, '0x' + '1'.repeat(40), '[]', '0x', '2026-09-20T00:00:00.000Z']);
    },
  });

  await engine1.runOnce();
  assert.deepEqual(seenFirst, [901]);
  first.save();
  first.close();

  const second = await createDatabase(filename);
  const seenSecond = [];
  const engine2 = createV4ProductionIngestionEngine({
    database: second,
    provider: { async getBlockNumber() { return 902; } },
    confirmations: 0,
    processor: async block => {
      seenSecond.push(block);
      second.db.run('INSERT INTO raw_events(event_id,chain_id,block_number,transaction_hash,log_index,address,topics_json,data,captured_at) VALUES(?,?,?,?,?,?,?,?,?)', ['restart-' + block, 4663, block, '0x' + String(block).padStart(64, '0'), 0, '0x' + '1'.repeat(40), '[]', '0x', '2026-09-20T00:00:00.000Z']);
    },
  });

  assert.equal(engine2.getActiveCursor().get(), 901);
  await engine2.runOnce();
  assert.deepEqual(seenSecond, [902]);
  assert.equal(engine2.getActiveCursor().get(), 902);

  second.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
