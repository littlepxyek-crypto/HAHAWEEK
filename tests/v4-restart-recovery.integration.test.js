'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createDatabase } = require('../src/core/database');
const { createAuthorityRecord } = require('../src/core/v4-authority-record');
const { expectedCheckpointHash, expectedCursorHash } = require('../src/core/v4-checkpoint-authority');
const { persistAuthorityAndCursor } = require('../src/core/v4-cursor-store');
const { loadAuthorityRecord, loadCurrentCursor } = {
  loadAuthorityRecord: require('../src/core/v4-authority-store').loadAuthorityRecord,
  loadCurrentCursor: require('../src/core/v4-cursor-store').loadCurrentCursor,
};
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
      manifest: {
        exists: true,
        hash: manifestHash,
        generation: '7',
        inventory_valid: true,
        segments_valid: true,
      },
      checkpoint: {
        input: checkpointInput,
        hash: checkpointHash,
      },
    },
  };
}

function tempDbPath() {
  return path.join(
    os.tmpdir(),
    `hahaweek-v4-restart-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`
  );
}

test('V4 persistent restart resumes exactly after the durable authority cursor', async () => {
  const filename = tempDbPath();
  const firstRunBlocks = [];
  const secondRunBlocks = [];

  try {
    const firstDb = await createDatabase(filename);
    const { record, authorityContext } = fixture('100');
    persistAuthorityAndCursor(firstDb, record, 100);

    const firstAdapter = new V4BlockCursorAdapter({
      database: firstDb,
      authorityRecord: record,
      authorityContext,
    });

    const firstEngine = new IngestionEngine({
      provider: { async getBlockNumber() { return 101; } },
      cursor: { get: () => 999 },
      confirmations: 0,
      processor: async block => firstRunBlocks.push(block),
      v4CursorAdapter: firstAdapter,
      v4Database: firstDb,
    });

    const firstResult = await firstEngine.runOnce();
    assert.equal(firstResult.cursor, 101);
    assert.deepEqual(firstRunBlocks, [101]);
    firstDb.save();
    firstDb.close();

    const restartedDb = await createDatabase(filename);
    const persistedCursor = loadCurrentCursor(restartedDb);
    assert.equal(persistedCursor.position, '101');

    const persistedAuthority = loadAuthorityRecord(
      restartedDb,
      persistedCursor.authority_record_id
    );
    assert.ok(persistedAuthority);

    const restartContext = fixture('101').authorityContext;
    const restartedAdapter = new V4BlockCursorAdapter({
      database: restartedDb,
      authorityRecord: persistedAuthority,
      authorityContext: restartContext,
    });

    assert.equal(restartedAdapter.get(), 101);

    const restartedEngine = new IngestionEngine({
      provider: { async getBlockNumber() { return 102; } },
      cursor: { get: () => 999 },
      confirmations: 0,
      processor: async block => secondRunBlocks.push(block),
      v4CursorAdapter: restartedAdapter,
      v4Database: restartedDb,
    });

    const secondResult = await restartedEngine.runOnce();
    assert.equal(secondResult.cursor, 102);
    assert.deepEqual(secondRunBlocks, [102]);
    assert.notDeepEqual(secondRunBlocks, [101]);

    restartedDb.close();
  } finally {
    if (fs.existsSync(filename)) fs.unlinkSync(filename);
    if (fs.existsSync(`${filename}.tmp`)) fs.unlinkSync(`${filename}.tmp`);
  }
});
