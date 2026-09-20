'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createDatabase } = require('../src/core/database');
const { createAuthorityRecord } = require('../src/core/v4-authority-record');
const { expectedCheckpointHash, expectedCursorHash } = require('../src/core/v4-checkpoint-authority');
const { persistAuthorityAndCursor, loadCurrentCursor } = require('../src/core/v4-cursor-store');
const { V4BlockCursorAdapter } = require('../src/core/v4-block-cursor-adapter');
const { IngestionEngine } = require('../src/core/ingestion');

function fixture(position = '100') {
  const manifestHash = '0x' + 'a'.repeat(64);
  const checkpointInput = { generation: '7', manifest_hash: manifestHash };
  const checkpointHash = expectedCheckpointHash(checkpointInput);
  const cursorInput = { generation: '7', checkpoint_hash: checkpointHash, position };
  const cursorHash = expectedCursorHash(cursorInput);
  const record = createAuthorityRecord({
    manifestGeneration: '7',
    manifestHash,
    checkpointInput,
    checkpointHash,
    cursorInput,
    cursorHash,
    acquisitionPositionValid: true,
  });
  return {
    record,
    authorityContext: {
      manifest: { exists: true, hash: manifestHash, generation: '7', inventory_valid: true, segments_valid: true },
      checkpoint: { input: checkpointInput, hash: checkpointHash },
    },
  };
}

function insertRaw(database, block) {
  database.db.run(
    'INSERT INTO raw_events(event_id,chain_id,block_number,transaction_hash,log_index,address,topics_json,data,captured_at) VALUES(?,?,?,?,?,?,?,?,?)',
    ['e-' + block, 4663, block, '0x' + String(block).padStart(64, '0'), 0, '0x' + '1'.repeat(40), '[]', '0x', '2026-09-20T00:00:00.000Z']
  );
}

test('V4 crash boundary leaves evidence and cursor unchanged when commit never occurs', async () => {
  const db = await createDatabase(':memory:');
  const { record, authorityContext } = fixture('100');
  persistAuthorityAndCursor(db, record, 100);

  const adapter = new V4BlockCursorAdapter({ database: db, authorityRecord: record, authorityContext });
  const engine = new IngestionEngine({
    provider: { async getBlockNumber() { return 101; } },
    cursor: { get: () => 999 },
    confirmations: 0,
    processor: async block => {
      insertRaw(db, block);
      throw new Error('SIMULATED_CRASH_BEFORE_CURSOR_COMMIT');
    },
    v4CursorAdapter: adapter,
    v4Database: db,
  });

  await assert.rejects(() => engine.runOnce(), /SIMULATED_CRASH_BEFORE_CURSOR_COMMIT/);
  assert.equal(db.db.exec('SELECT COUNT(*) FROM raw_events')[0].values[0][0], 0);
  assert.equal(loadCurrentCursor(db).position, '100');
  assert.equal(db.db.exec('SELECT COUNT(*) FROM v4_authority_records')[0].values[0][0], 1);
  db.close();
});

test('V4 crash boundary commits evidence and cursor together on successful retry', async () => {
  const db = await createDatabase(':memory:');
  const { record, authorityContext } = fixture('100');
  persistAuthorityAndCursor(db, record, 100);

  const adapter = new V4BlockCursorAdapter({ database: db, authorityRecord: record, authorityContext });
  const engine = new IngestionEngine({
    provider: { async getBlockNumber() { return 101; } },
    cursor: { get: () => 999 },
    confirmations: 0,
    processor: async block => insertRaw(db, block),
    v4CursorAdapter: adapter,
    v4Database: db,
  });

  const result = await engine.runOnce();
  assert.equal(result.cursor, 101);
  assert.equal(db.db.exec('SELECT COUNT(*) FROM raw_events')[0].values[0][0], 1);
  assert.equal(loadCurrentCursor(db).position, '101');
  assert.equal(db.db.exec('SELECT COUNT(*) FROM v4_authority_records')[0].values[0][0], 2);
  db.close();
});
