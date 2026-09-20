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

test('V4 production ingestion seam fails closed on persisted manifest corruption', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-v4-seam-manifest-corrupt-'));
  const filename = path.join(dir, 'authority.sqlite');
  const f = fixture();
  const db = await createDatabase(filename);
  insertManifest(db, f.manifest);
  insertCheckpoint(db, f.checkpoint);
  insertAuthorityRecord(db, f.record);
  db.db.run('UPDATE v4_manifests SET generation = ?, manifest_json = ? WHERE manifest_hash = ?', ['22', JSON.stringify({ ...f.manifest, generation: '22' }), f.manifest.hash]);

  let processed = 0;
  assert.throws(() => createV4ProductionIngestionEngine({
    database: db,
    provider: { async getBlockNumber() { return 901; } },
    confirmations: 0,
    processor: async () => { processed += 1; },
  }), /CHECKPOINT_AUTHORITY_INVALID/);
  assert.equal(processed, 0);

  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('V4 production ingestion seam fails closed on persisted checkpoint corruption', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-v4-seam-checkpoint-corrupt-'));
  const filename = path.join(dir, 'authority.sqlite');
  const f = fixture();
  const db = await createDatabase(filename);
  insertManifest(db, f.manifest);
  insertCheckpoint(db, f.checkpoint);
  insertAuthorityRecord(db, f.record);
  db.db.run('UPDATE v4_checkpoints SET checkpoint_input_json = ? WHERE checkpoint_hash = ?', [JSON.stringify({ generation: '20', manifest_hash: f.manifest.hash }), f.checkpoint.hash]);

  let processed = 0;
  assert.throws(() => createV4ProductionIngestionEngine({
    database: db,
    provider: { async getBlockNumber() { return 901; } },
    confirmations: 0,
    processor: async () => { processed += 1; },
  }), /CHECKPOINT_AUTHORITY_INVALID/);
  assert.equal(processed, 0);

  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('V4 production ingestion seam fails closed on persisted cursor corruption without legacy fallback', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-v4-seam-cursor-corrupt-'));
  const filename = path.join(dir, 'authority.sqlite');
  const f = fixture();
  const db = await createDatabase(filename);
  insertManifest(db, f.manifest);
  insertCheckpoint(db, f.checkpoint);
  insertAuthorityRecord(db, f.record);
  db.db.run('UPDATE v4_authority_records SET cursor_input_json = ? WHERE record_id = ?', [JSON.stringify({ generation: '21', checkpoint_hash: f.checkpoint.hash, position: '901' }), f.record.record_id]);

  let processed = 0;
  assert.throws(() => createV4ProductionIngestionEngine({
    database: db,
    provider: { async getBlockNumber() { return 901; } },
    confirmations: 0,
    processor: async () => { processed += 1; },
  }), /CURSOR_AUTHORITY_INVALID|AUTHORITY_RECORD_INVALID/);
  assert.equal(processed, 0);

  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});


test('V4 production engine seam wires raw logs through the transactional processor boundary', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-v4-engine-processor-'));
  const filename = path.join(dir, 'authority.sqlite');
  const f = fixture();
  const db = await createDatabase(filename);
  insertManifest(db, f.manifest);
  insertCheckpoint(db, f.checkpoint);
  insertAuthorityRecord(db, f.record);
  db.save();

  const calls = [];
  let saves = 0;
  const rawLogs = {
    async ingestRange(fromBlock, toBlock, filter) {
      calls.push({ fromBlock, toBlock, filter });
      db.db.run(
        'INSERT INTO raw_events(event_id,chain_id,block_number,transaction_hash,log_index,address,topics_json,data,captured_at) VALUES(?,?,?,?,?,?,?,?,?)',
        ['processor-' + toBlock, 4663, toBlock, '0x' + String(toBlock).padStart(64, '0'), 0, '0x' + '1'.repeat(40), '[]', '0x', '2026-09-20T00:00:00.000Z']
      );
      return { fetched: 1, inserted: 1, duplicates: 0 };
    },
  };

  const engine = createV4ProductionIngestionEngine({
    database: db,
    provider: { async getBlockNumber() { return 901; } },
    confirmations: 0,
    rawLogs,
    filterFactory: () => ({ address: '0xpool', topics: [['0xtopic']] }),
    batchSize: 1,
  });

  db.save = () => { saves += 1; };
  const result = await engine.runOnce();

  assert.equal(result.cursor, 901);
  assert.equal(engine.getActiveCursor().get(), 901);
  assert.deepEqual(calls.map(call => [call.fromBlock, call.toBlock]), [[901, 901]]);
  assert.equal(saves, 1);
  assert.equal(db.db.exec('SELECT COUNT(*) FROM raw_events')[0].values[0][0], 1);
  assert.equal(db.db.exec('SELECT COUNT(*) FROM v4_authority_records')[0].values[0][0], 2);

  db.db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
