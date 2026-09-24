'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createDatabase,
} = require('../src/core/database');

function tempDatabasePath() {
  return path.join(
    fs.mkdtempSync(
      path.join(os.tmpdir(), 'hahaweek-db-')
    ),
    'test.sqlite'
  );
}

test('database persists data across reload', async () => {
  const filename = tempDatabasePath();

  const first = await createDatabase(filename);

  first.db.run(`
    INSERT INTO raw_events (
      event_id,
      chain_id,
      block_number,
      transaction_hash,
      log_index,
      address,
      topics_json,
      data,
      captured_at
    )
    VALUES (
      '4663:100:0xabc:0',
      4663,
      100,
      '0xabc',
      0,
      '0xpool',
      '["0xtopic"]',
      '0xdata',
      '2026-01-01T00:00:00.000Z'
    )
  `);

  first.save();
  first.db.close();

  const second = await createDatabase(filename);

  const rows = second.db.exec(`
    SELECT
      event_id,
      chain_id,
      block_number,
      transaction_hash,
      log_index
    FROM raw_events
  `);

  assert.equal(rows[0].values.length, 1);
  assert.deepEqual(
    rows[0].values[0],
    [
      '4663:100:0xabc:0',
      4663,
      100,
      '0xabc',
      0,
    ]
  );

  second.db.close();
});

test('raw event identity is idempotent', async () => {
  const filename = tempDatabasePath();

  const database = await createDatabase(filename);

  const insert = database.db.prepare(`
    INSERT OR IGNORE INTO raw_events (
      event_id,
      chain_id,
      block_number,
      transaction_hash,
      log_index,
      address,
      topics_json,
      data,
      captured_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const event = [
    '4663:200:0xdef:1',
    4663,
    200,
    '0xdef',
    1,
    '0xpool',
    '["0xtopic"]',
    '0xdata',
    '2026-01-01T00:00:00.000Z',
  ];

  insert.run(event);
  insert.run(event);

  insert.free();

  const rows = database.db.exec(`
    SELECT COUNT(*)
    FROM raw_events
    WHERE event_id = '4663:200:0xdef:1'
  `);

  assert.equal(rows[0].values[0][0], 1);

  database.close();
});

test('schema version is persisted', async () => {
  const filename = tempDatabasePath();

  const database = await createDatabase(filename);

  const rows = database.db.exec(`
    SELECT value
    FROM schema_meta
    WHERE key = 'schema_version'
  `);

  assert.equal(rows[0].values[0][0], '5');

  database.close();
});
