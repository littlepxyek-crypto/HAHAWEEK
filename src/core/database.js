'use strict';

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { createLegacyWriteBarrier } = require('./legacy-write-freeze');

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'hahaweek.sqlite');

async function createDatabase(filename = DB_FILE, options = {}) {
  const legacyWriteBarrier =
    options.legacyWriteBarrier || createLegacyWriteBarrier();

  fs.mkdirSync(path.dirname(filename), { recursive: true });

  const SQL = await initSqlJs({
    locateFile: file =>
      path.join(
        process.cwd(),
        'node_modules',
        'sql.js',
        'dist',
        file
      ),
  });

  let db;
  const inMemory = filename === ':memory:';

  if (inMemory) {
    db = new SQL.Database();
  } else if (fs.existsSync(filename)) {
    db = new SQL.Database(new Uint8Array(fs.readFileSync(filename)));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS raw_events (
      event_id TEXT PRIMARY KEY,
      chain_id INTEGER NOT NULL,
      block_number INTEGER NOT NULL,
      transaction_hash TEXT NOT NULL,
      block_hash TEXT,
      transaction_index INTEGER,
      log_index INTEGER NOT NULL,
      address TEXT NOT NULL,
      topics_json TEXT NOT NULL,
      data TEXT NOT NULL,
      captured_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pools (
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

    CREATE TABLE IF NOT EXISTS liquidity_events (
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

    CREATE TABLE IF NOT EXISTS flow_windows (
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

    CREATE TABLE IF NOT EXISTS ingestion_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS canonical_evidence (
      evidence_id TEXT PRIMARY KEY,
      identity_schema_version TEXT NOT NULL,
      identity_hash TEXT NOT NULL,
      raw_event_id TEXT NOT NULL,
      raw_hash TEXT NOT NULL,
      canonical_hash TEXT NOT NULL,
      canonical_json TEXT NOT NULL,
      interpretation_status TEXT NOT NULL,
      provenance_json TEXT NOT NULL,
      stored_at TEXT NOT NULL,
      FOREIGN KEY (raw_event_id) REFERENCES raw_events(event_id)
    );

    INSERT OR IGNORE INTO schema_meta (key, value)
    VALUES ('schema_version', '1');
  `);

  const rawColumns = db.exec('PRAGMA table_info(raw_events)')[0]?.values ?? [];
  const rawColumnNames = new Set(rawColumns.map(row => row[1]));

  if (!rawColumnNames.has('block_hash')) {
    db.run('ALTER TABLE raw_events ADD COLUMN block_hash TEXT');
  }

  if (!rawColumnNames.has('transaction_index')) {
    db.run('ALTER TABLE raw_events ADD COLUMN transaction_index INTEGER');
  }

  db.run("UPDATE schema_meta SET value = '3' WHERE key = 'schema_version'");

  const isReadOnlyStatement = sql => {
    const normalized = String(sql).trim().toUpperCase();
    return normalized.startsWith('SELECT ')
      || normalized.startsWith('SELECT\\n')
      || normalized.startsWith('PRAGMA ')
      || normalized.startsWith('EXPLAIN ');
  };

  const guardedDb = {
    run(...args) {
      legacyWriteBarrier.assertWritable();
      return db.run(...args);
    },
    exec(...args) {
      return db.exec(...args);
    },
    prepare(sql, ...args) {
      if (!isReadOnlyStatement(sql)) {
        legacyWriteBarrier.assertWritable();
      }
      const statement = db.prepare(sql, ...args);
      return {
        bind: (...bindArgs) => statement.bind(...bindArgs),
        run: (...runArgs) => {
          legacyWriteBarrier.assertWritable();
          return statement.run(...runArgs);
        },
        step: (...stepArgs) => {
          if (!isReadOnlyStatement(sql)) {
            legacyWriteBarrier.assertWritable();
          }
          return statement.step(...stepArgs);
        },
        getAsObject: (...objectArgs) => statement.getAsObject(...objectArgs),
        get: (...getArgs) => statement.get(...getArgs),
        reset: (...resetArgs) => statement.reset(...resetArgs),
        free: (...freeArgs) => statement.free(...freeArgs),
      };
    },
    getRowsModified(...args) {
      return db.getRowsModified(...args);
    },
    close(...args) {
      return db.close(...args);
    },
  };

  return {
    db: guardedDb,

    save() {
      if (inMemory) return;

      legacyWriteBarrier.assertWritable();

      const data = db.export();
      const tmp = filename + '.tmp';
      fs.writeFileSync(tmp, Buffer.from(data));
      fs.renameSync(tmp, filename);
    },

    close() {
      if (!inMemory) this.save();
      db.close();
    },
  };
}

module.exports = {
  DB_FILE,
  createDatabase,
};
