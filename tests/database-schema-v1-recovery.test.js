'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const initSqlJs = require('sql.js');

const { createDatabase } = require('../src/core/database');

function tempDatabasePath() {
  return path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-v1-migration-')),
    'legacy.sqlite'
  );
}

async function createSchemaV1Fixture(filename, { malformed = false } = {}) {
  const SQL = await initSqlJs({
    locateFile: file => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
  });
  const db = new SQL.Database();
  db.run(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE raw_events (
      event_id TEXT PRIMARY KEY,
      chain_id INTEGER NOT NULL,
      block_number INTEGER NOT NULL,
      transaction_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL,
      address TEXT NOT NULL,
      topics_json TEXT NOT NULL,
      data TEXT NOT NULL,
      captured_at TEXT NOT NULL
    );
    CREATE TABLE pools (
      pool_id TEXT PRIMARY KEY,
      chain_id INTEGER NOT NULL,
      pool_manager TEXT NOT NULL,
      currency0 TEXT NOT NULL,
      currency1 TEXT NOT NULL,
      fee INTEGER NOT NULL,
      tick_spacing INTEGER NOT NULL,
      hooks TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      transaction_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE liquidity_events (
      event_id TEXT PRIMARY KEY,
      chain_id INTEGER NOT NULL,
      pool_id TEXT NOT NULL,
      pool_manager TEXT NOT NULL,
      sender TEXT NOT NULL,
      tick_lower INTEGER NOT NULL,
      tick_upper INTEGER NOT NULL,
      liquidity_delta TEXT NOT NULL,
      salt TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      transaction_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL,
      captured_at TEXT NOT NULL
    );
    CREATE TABLE flow_windows (
      chain_id INTEGER NOT NULL,
      pool_id TEXT NOT NULL,
      window_start INTEGER NOT NULL,
      window_end INTEGER NOT NULL,
      swap_count INTEGER NOT NULL,
      unique_sender_count INTEGER NOT NULL,
      total_amount0 TEXT NOT NULL,
      total_amount1 TEXT NOT NULL,
      first_block INTEGER NOT NULL,
      last_block INTEGER NOT NULL,
      first_timestamp INTEGER NOT NULL,
      last_timestamp INTEGER NOT NULL,
      PRIMARY KEY (chain_id, pool_id, window_start)
    );
    CREATE TABLE ingestion_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO schema_meta (key, value) VALUES ('schema_version', '1');
  `);

  if (!malformed) {
    db.run(`
      INSERT INTO raw_events (
        event_id, chain_id, block_number, transaction_hash,
        log_index, address, topics_json, data, captured_at
      ) VALUES (
        '4663:123:0xlegacy:0', 4663, 123, '0xlegacy',
        0, '0xpool', '[\"0xtopic\"]', '0xdata',
        '2026-01-01T00:00:00.000Z'
      )
    `);
  }

  fs.writeFileSync(filename, Buffer.from(db.export()));
  db.close();
}

test('schema v1 migrates through v3 to v9 without rewriting legacy rows', async () => {
  const filename = tempDatabasePath();
  await createSchemaV1Fixture(filename);

  const database = await createDatabase(filename);

  const version = database.db.exec(
    "SELECT value FROM schema_meta WHERE key = 'schema_version'"
  )[0].values[0][0];
  assert.equal(version, '9');

  const row = database.db.exec(`
    SELECT event_id, chain_id, block_number, transaction_hash,
           log_index, address, topics_json, data, captured_at,
           block_hash, transaction_index
    FROM raw_events
  `)[0].values[0];

  assert.deepEqual(row, [
    '4663:123:0xlegacy:0',
    4663,
    123,
    '0xlegacy',
    0,
    '0xpool',
    '[\"0xtopic\"]',
    '0xdata',
    '2026-01-01T00:00:00.000Z',
    null,
    null,
  ]);

  assert.ok(database.db.exec(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'canonical_evidence'"
  ).length);

  database.close();
});

test('malformed schema v1 fails closed without upgrading the schema version', async () => {
  const filename = tempDatabasePath();
  await createSchemaV1Fixture(filename, { malformed: true });

  const SQL = await initSqlJs({
    locateFile: file => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
  });
  const db = new SQL.Database(new Uint8Array(fs.readFileSync(filename)));
  db.run('DROP TABLE liquidity_events');
  fs.writeFileSync(filename, Buffer.from(db.export()));
  db.close();

  await assert.rejects(
    () => createDatabase(filename),
    /BASE_TABLE_MISSING_LIQUIDITY_EVENTS/
  );

  const check = new SQL.Database(new Uint8Array(fs.readFileSync(filename)));
  assert.equal(
    check.exec("SELECT value FROM schema_meta WHERE key = 'schema_version'")[0].values[0][0],
    '1'
  );
  check.close();
});
