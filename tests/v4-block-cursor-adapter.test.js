'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('../src/core/database');
const { createAuthorityRecord } = require('../src/core/v4-authority-record');
const { expectedCheckpointHash, expectedCursorHash } = require('../src/core/v4-checkpoint-authority');
const { V4BlockCursorAdapter } = require('../src/core/v4-block-cursor-adapter');
const { persistAuthorityAndCursor } = require('../src/core/v4-cursor-store');

function fixture(position = '101') {
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

function seed(database, position = '101') {
  const fixtureData = fixture(position);
  persistAuthorityAndCursor(database, fixtureData.record, Number(position));
  return fixtureData;
}

test('opt-in V4 BlockCursor adapter advances through a validated authority chain', async () => {
  const database = await createDatabase(':memory:');
  const { record, authorityContext } = seed(database);
  const adapter = new V4BlockCursorAdapter({ database, authorityRecord: record, authorityContext });
  assert.equal(adapter.get(), 101);
  assert.equal(adapter.advance(102), 102);
  assert.equal(adapter.get(), 102);
  assert.equal(database.db.exec('SELECT COUNT(*) FROM v4_authority_records')[0].values[0][0], 2);
  database.close();
});

test('V4 BlockCursor adapter rejects regression without persistence', async () => {
  const database = await createDatabase(':memory:');
  const { record, authorityContext } = seed(database);
  const adapter = new V4BlockCursorAdapter({ database, authorityRecord: record, authorityContext });
  adapter.advance(102);
  assert.throws(() => adapter.advance(101), /BLOCK_CURSOR_REGRESSION/);
  assert.equal(adapter.get(), 102);
  assert.equal(database.db.exec('SELECT COUNT(*) FROM v4_authority_records')[0].values[0][0], 2);
  database.close();
});

test('V4 BlockCursor adapter fails closed when authority context is absent', async () => {
  const database = await createDatabase(':memory:');
  const { record } = seed(database);
  assert.throws(
    () => new V4BlockCursorAdapter({ database, authorityRecord: record }),
    /V4_AUTHORITY_CONTEXT_REQUIRED/
  );
  database.close();
});

test('V4 BlockCursor adapter rejects manifest authority mismatch before persistence', async () => {
  const database = await createDatabase(':memory:');
  const { record, authorityContext } = seed(database);
  authorityContext.manifest.hash = '0x' + 'c'.repeat(64);
  assert.throws(
    () => new V4BlockCursorAdapter({ database, authorityRecord: record, authorityContext }),
    /CHECKPOINT_AUTHORITY_INVALID/
  );
  assert.equal(database.db.exec('SELECT COUNT(*) FROM v4_authority_records')[0].values[0][0], 1);
  assert.equal(database.db.exec("SELECT position FROM v4_cursor_state WHERE singleton_key='current'")[0].values[0][0], '101');
  database.close();
});

test('V4 BlockCursor adapter is opt-in and does not alter legacy BlockCursor', () => {
  const { BlockCursor } = require('../src/core/block-cursor');
  let state = { lastProcessedBlock: 100 };
  const cursor = new BlockCursor({ loadState: () => ({ ...state }), saveState: s => { state = { ...s }; } });
  assert.equal(cursor.advance(101), 101);
  assert.equal(state.lastProcessedBlock, 101);
});


test('Robinhood block position mapping rejects a uint64 position outside the JS-safe block range', () => {
  const { blockNumberToPosition } = require('../src/core/v4-robinhood-block-position');
  assert.throws(
    () => blockNumberToPosition(Number.MAX_SAFE_INTEGER + 1),
    /ACQUISITION_BLOCK_INVALID/
  );
});

test('V4 BlockCursor adapter rejects a non-block acquisition coordinate', async () => {
  const database = await createDatabase(':memory:');
  const { record, authorityContext } = seed(database, '101');
  const adapter = new V4BlockCursorAdapter({ database, authorityRecord: record, authorityContext });
  assert.throws(() => adapter.advance(-1), /INVALID_BLOCK_NUMBER/);
  assert.throws(() => adapter.advance(101.5), /INVALID_BLOCK_NUMBER/);
  assert.equal(adapter.get(), 101);
  database.close();
});

test('Robinhood block position mapping rejects an exact position mismatch', () => {
  const { assertPositionMatchesBlock } = require('../src/core/v4-robinhood-block-position');
  assert.throws(
    () => assertPositionMatchesBlock('102', 101),
    /ACQUISITION_POSITION_MISMATCH/
  );
});
