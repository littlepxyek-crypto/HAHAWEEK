'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('../src/core/database');
const { createAuthorityRecord } = require('../src/core/v4-authority-record');
const { V4BlockCursorAdapter } = require('../src/core/v4-block-cursor-adapter');
const { persistAuthorityAndCursor } = require('../src/core/v4-cursor-store');

function fixture(position='101') {
  return createAuthorityRecord({ manifestGeneration:'7', manifestHash:'0x'+'a'.repeat(64), checkpointInput:{generation:'7',manifest_hash:'0x'+'a'.repeat(64)}, checkpointHash:'0x'+'b'.repeat(64), cursorInput:{generation:'7',checkpoint_hash:'0x'+'b'.repeat(64),position}, cursorHash:'0x'+'c'.repeat(64), acquisitionPositionValid:true });
}

function seed(database, position='101') {
  const record = fixture(position);
  persistAuthorityAndCursor(database, record, Number(position));
  return record;
}

test('opt-in V4 BlockCursor adapter advances through a new canonical authority record', async () => {
  const database = await createDatabase(':memory:');
  const initial = seed(database);
  const adapter = new V4BlockCursorAdapter({database, authorityRecord:initial});
  assert.equal(adapter.get(),101);
  assert.equal(adapter.advance(102),102);
  assert.equal(adapter.get(),102);
  assert.equal(database.db.exec('SELECT COUNT(*) FROM v4_authority_records')[0].values[0][0],2);
  database.close();
});

test('V4 BlockCursor adapter rejects regression without persistence', async () => {
  const database = await createDatabase(':memory:');
  const initial = seed(database);
  const adapter = new V4BlockCursorAdapter({database, authorityRecord:initial});
  adapter.advance(102);
  assert.throws(() => adapter.advance(101), /BLOCK_CURSOR_REGRESSION/);
  assert.equal(adapter.get(),102);
  assert.equal(database.db.exec('SELECT COUNT(*) FROM v4_authority_records')[0].values[0][0],2);
  database.close();
});

test('V4 BlockCursor adapter is opt-in and does not alter legacy BlockCursor', () => {
  const { BlockCursor } = require('../src/core/block-cursor');
  let state={lastProcessedBlock:100};
  const cursor=new BlockCursor({loadState:()=>({...state}),saveState:s=>{state={...s}}});
  assert.equal(cursor.advance(101),101);
  assert.equal(state.lastProcessedBlock,101);
});