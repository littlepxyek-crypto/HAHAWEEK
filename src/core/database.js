'use strict';

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'hahaweek.sqlite');

function transaction(db, work) {
  db.run('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.run('COMMIT');
    return result;
  } catch (error) {
    try { db.run('ROLLBACK'); } catch (_) {}
    throw error;
  }
}

async function createDatabase(filename = DB_FILE) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const SQL = await initSqlJs({ locateFile: file => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file) });
  const inMemory = filename === ':memory:';
  let db;
  if (inMemory) db = new SQL.Database();
  else if (fs.existsSync(filename)) db = new SQL.Database(new Uint8Array(fs.readFileSync(filename)));
  else db = new SQL.Database();

  db.run(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS raw_events (event_id TEXT PRIMARY KEY, chain_id INTEGER NOT NULL, block_number INTEGER NOT NULL, transaction_hash TEXT NOT NULL, log_index INTEGER NOT NULL, address TEXT NOT NULL, topics_json TEXT NOT NULL, data TEXT NOT NULL, captured_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pools (pool_id TEXT PRIMARY KEY, chain_id INTEGER NOT NULL, pool_manager TEXT NOT NULL, currency0 TEXT NOT NULL, currency1 TEXT NOT NULL, fee INTEGER NOT NULL, tick_spacing INTEGER NOT NULL, hooks TEXT NOT NULL, block_number INTEGER NOT NULL, transaction_hash TEXT NOT NULL, log_index INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS liquidity_events (event_id TEXT PRIMARY KEY, chain_id INTEGER NOT NULL, pool_id TEXT NOT NULL, pool_manager TEXT NOT NULL, sender TEXT NOT NULL, tick_lower INTEGER NOT NULL, tick_upper INTEGER NOT NULL, liquidity_delta TEXT NOT NULL, salt TEXT NOT NULL, block_number INTEGER NOT NULL, transaction_hash TEXT NOT NULL, log_index INTEGER NOT NULL, captured_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS flow_windows (chain_id INTEGER NOT NULL, pool_id TEXT NOT NULL, window_start INTEGER NOT NULL, window_end INTEGER NOT NULL, swap_count INTEGER NOT NULL, unique_sender_count INTEGER NOT NULL, total_amount0 TEXT NOT NULL, total_amount1 TEXT NOT NULL, first_block INTEGER NOT NULL, last_block INTEGER NOT NULL, first_timestamp INTEGER NOT NULL, last_timestamp INTEGER NOT NULL, PRIMARY KEY (chain_id, pool_id, window_start));
    CREATE TABLE IF NOT EXISTS ingestion_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS v4_authority_records (record_id TEXT PRIMARY KEY, schema_version INTEGER NOT NULL, manifest_generation TEXT NOT NULL, manifest_hash TEXT NOT NULL, checkpoint_input_json TEXT NOT NULL, checkpoint_hash TEXT NOT NULL, cursor_input_json TEXT NOT NULL, cursor_hash TEXT NOT NULL, acquisition_position_valid INTEGER NOT NULL CHECK (acquisition_position_valid IN (0,1)), created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS v4_cursor_state (singleton_key TEXT PRIMARY KEY CHECK (singleton_key = 'current'), generation TEXT NOT NULL, position TEXT NOT NULL, checkpoint_hash TEXT NOT NULL, cursor_hash TEXT NOT NULL, authority_record_id TEXT NOT NULL, updated_at TEXT NOT NULL);
    INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('schema_version', '1');
  `);

  const api = {
    db,
    transaction(work) { return transaction(db, work); },
    save() { if (inMemory) return; const data = db.export(); const tmp = `${filename}.tmp`; fs.writeFileSync(tmp, Buffer.from(data)); fs.renameSync(tmp, filename); },
    close() { if (!inMemory) this.save(); db.close(); },
  };

  return api;
}

module.exports = { DB_FILE, createDatabase, transaction };