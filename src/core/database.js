'use strict';

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { createLegacyWriteBarrier } = require('./legacy-write-freeze');

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'hahaweek.sqlite');
const SCHEMA_VERSION = 4;

const F03_DDL = {
  segments: \`
    CREATE TABLE f03_segments (
      segment_id TEXT PRIMARY KEY,
      from_block INTEGER NOT NULL,
      to_block INTEGER NOT NULL,
      segment_digest TEXT NOT NULL,
      generation TEXT NOT NULL,
      provenance_json TEXT NOT NULL,
      committed_at TEXT NOT NULL,
      CHECK (from_block >= 0),
      CHECK (to_block >= 0),
      CHECK (from_block <= to_block),
      UNIQUE (segment_id, segment_digest)
    );
  \`,
  manifests: \`
    CREATE TABLE f03_manifests (
      manifest_id TEXT PRIMARY KEY,
      manifest_digest TEXT NOT NULL,
      generation TEXT NOT NULL,
      segment_id TEXT NOT NULL,
      segment_digest TEXT NOT NULL,
      provenance_json TEXT NOT NULL,
      committed_at TEXT NOT NULL,
      UNIQUE (manifest_id, manifest_digest),
      FOREIGN KEY (segment_id, segment_digest)
        REFERENCES f03_segments(segment_id, segment_digest)
    );
  \`,
  checkpoints: \`
    CREATE TABLE f03_checkpoints (
      checkpoint_digest TEXT PRIMARY KEY,
      generation TEXT NOT NULL,
      manifest_id TEXT NOT NULL,
      manifest_digest TEXT NOT NULL,
      provenance_json TEXT NOT NULL,
      committed_at TEXT NOT NULL,
      FOREIGN KEY (manifest_id, manifest_digest)
        REFERENCES f03_manifests(manifest_id, manifest_digest)
    );
  \`,
};

function normalizeSql(sql) {
  return String(sql || '').replace(/\\s+/g, ' ').trim().toUpperCase();
}

function hasTable(db, name) {
  const result = db.exec(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [name]
  );
  return result.length && result[0].values.length === 1;
}

function schemaVersion(db) {
  const result = db.exec(
    "SELECT value FROM schema_meta WHERE key = 'schema_version'"
  );
  if (!result.length || result[0].values.length !== 1) {
    throw new Error('SCHEMA_VERSION_MISSING');
  }

  const value = result[0].values[0][0];
  if (!/^[0-9]+$/.test(String(value))) {
    throw new Error('SCHEMA_VERSION_INVALID');
  }

  return Number(value);
}

function assertRequiredBaseSchema(db) {
  const requiredTables = [
    'schema_meta',
    'raw_events',
    'pools',
    'liquidity_events',
    'flow_windows',
    'ingestion_state',
    'canonical_evidence',
  ];

  for (const table of requiredTables) {
    if (!hasTable(db, table)) {
      throw new Error('BASE_TABLE_MISSING_' + table.toUpperCase());
    }
  }

  const rawColumns = db.exec('PRAGMA table_info(raw_events)')[0]?.values ?? [];
  const rawColumnNames = new Set(rawColumns.map(row => row[1]));
  if (!rawColumnNames.has('block_hash') || !rawColumnNames.has('transaction_index')) {
    throw new Error('SCHEMA_VERSION_3_BASE_SCHEMA_INVALID');
  }
}

function assertF03Table(db, tableName, expectedSql, expectedColumns, expectedForeignKeys) {
  if (!hasTable(db, tableName)) {
    throw new Error('F03_TABLE_MISSING_' + tableName.toUpperCase());
  }

  const sqlResult = db.exec(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tableName]
  );
  const actualSql = sqlResult[0]?.values?.[0]?.[0];
  if (normalizeSql(actualSql) !== normalizeSql(expectedSql)) {
    throw new Error('F03_TABLE_MALFORMED_' + tableName.toUpperCase());
  }

  const columns = db.exec('PRAGMA table_info(' + tableName + ')')[0]?.values ?? [];
  if (columns.length !== expectedColumns.length) {
    throw new Error('F03_TABLE_COLUMNS_INVALID_' + tableName.toUpperCase());
  }

  for (let i = 0; i < expectedColumns.length; i += 1) {
    const actual = columns[i];
    const expected = expectedColumns[i];
    if (
      actual[1] !== expected.name ||
      actual[2] !== expected.type ||
      actual[3] !== expected.notNull ||
      actual[5] !== expected.pk
    ) {
      throw new Error('F03_TABLE_COLUMNS_INVALID_' + tableName.toUpperCase());
    }
  }

  const foreignKeys = db.exec('PRAGMA foreign_key_list(' + tableName + ')')[0]?.values ?? [];
  if (foreignKeys.length !== expectedForeignKeys.length) {
    throw new Error('F03_TABLE_FOREIGN_KEYS_INVALID_' + tableName.toUpperCase());
  }

  for (const expected of expectedForeignKeys) {
    const found = foreignKeys.some(row =>
      row[2] === expected.table &&
      row[3] === expected.from &&
      row[4] === expected.to
    );
    if (!found) {
      throw new Error('F03_TABLE_FOREIGN_KEYS_INVALID_' + tableName.toUpperCase());
    }
  }
}

function assertF03Schema(db) {
  assertF03Table(
    db,
    'f03_segments',
    F03_DDL.segments,
    [
      { name: 'segment_id', type: 'TEXT', notNull: 0, pk: 1 },
      { name: 'from_block', type: 'INTEGER', notNull: 1, pk: 0 },
      { name: 'to_block', type: 'INTEGER', notNull: 1, pk: 0 },
      { name: 'segment_digest', type: 'TEXT', notNull: 1, pk: 0 },
      { name: 'generation', type: 'TEXT', notNull: 1, pk: 0 },
      { name: 'provenance_json', type: 'TEXT', notNull: 1, pk: 0 },
      { name: 'committed_at', type: 'TEXT', notNull: 1, pk: 0 },
    ],
    []
  );

  assertF03Table(
    db,
    'f03_manifests',
    F03_DDL.manifests,
    [
      { name: 'manifest_id', type: 'TEXT', notNull: 0, pk: 1 },
      { name: 'manifest_digest', type: 'TEXT', notNull: 1, pk: 0 },
      { name: 'generation', type: 'TEXT', notNull: 1, pk: 0 },
      { name: 'segment_id', type: 'TEXT', notNull: 1, pk: 0 },
      { name: 'segment_digest', type: 'TEXT', notNull: 1, pk: 0 },
      { name: 'provenance_json', type: 'TEXT', notNull: 1, pk: 0 },
      { name: 'committed_at', type: 'TEXT', notNull: 1, pk: 0 },
    ],
    [
      { table: 'f03_segments', from: 'segment_id', to: 'segment_id' },
    ]
  );

  assertF03Table(
    db,
    'f03_checkpoints',
    F03_DDL.checkpoints,
    [
      { name: 'checkpoint_digest', type: 'TEXT', notNull: 0, pk: 1 },
      { name: 'generation', type: 'TEXT', notNull: 1, pk: 0 },
      { name: 'manifest_id', type: 'TEXT', notNull: 1, pk: 0 },
      { name: 'manifest_digest', type: 'TEXT', notNull: 1, pk: 0 },
      { name: 'provenance_json', type: 'TEXT', notNull: 1, pk: 0 },
      { name: 'committed_at', type: 'TEXT', notNull: 1, pk: 0 },
    ],
    [
      { table: 'f03_manifests', from: 'manifest_id', to: 'manifest_id' },
    ]
  );

  const segmentForeignKeys = db.exec('PRAGMA foreign_key_list(f03_segments)')[0]?.values ?? [];
  if (segmentForeignKeys.length !== 0) {
    throw new Error('F03_TABLE_FOREIGN_KEYS_INVALID_F03_SEGMENTS');
  }
}

function createBaseSchema(db) {
  db.run(\`
    CREATE TABLE schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE raw_events (
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

    CREATE TABLE canonical_evidence (
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

    INSERT INTO schema_meta (key, value)
    VALUES ('schema_version', '4');

    \${F03_DDL.segments}
    \${F03_DDL.manifests}
    \${F03_DDL.checkpoints}
  \`);
}

function migrateV3ToV4(db) {
  assertRequiredBaseSchema(db);

  db.run('BEGIN');
  let committed = false;
  try {
    db.run(F03_DDL.segments);
    db.run(F03_DDL.manifests);
    db.run(F03_DDL.checkpoints);
    db.run("UPDATE schema_meta SET value = '4' WHERE key = 'schema_version'");
    db.run('COMMIT');
    committed = true;
  } finally {
    if (!committed) {
      try { db.run('ROLLBACK'); } catch {}
    }
  }
}

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
  const existing = !inMemory && fs.existsSync(filename);

  if (inMemory) {
    db = new SQL.Database();
  } else if (existing) {
    db = new SQL.Database(new Uint8Array(fs.readFileSync(filename)));
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON;');

  const hasMeta = hasTable(db, 'schema_meta');

  if (!hasMeta) {
    if (existing) throw new Error('SCHEMA_VERSION_MISSING');
    createBaseSchema(db);
    assertF03Schema(db);
  } else {
    const version = schemaVersion(db);

    if (version === 3) {
      migrateV3ToV4(db);
      assertF03Schema(db);
    } else if (version === 4) {
      assertRequiredBaseSchema(db);
      assertF03Schema(db);
    } else {
      throw new Error('UNSUPPORTED_SCHEMA_VERSION');
    }
  }

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

  const save = () => {
    if (inMemory) return;

    legacyWriteBarrier.assertWritable();

    const data = db.export();
    const tmp = filename + '.tmp';
    try {
      fs.writeFileSync(tmp, Buffer.from(data));
      fs.renameSync(tmp, filename);
    } catch (error) {
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {}
      throw error;
    }
  };

  const database = {
    db: guardedDb,

    save,

    snapshot() {
      return Buffer.from(db.export());
    },

    restore(snapshot) {
      if (!Buffer.isBuffer(snapshot) && !(snapshot instanceof Uint8Array)) {
        throw new Error('DATABASE_SNAPSHOT_INVALID');
      }
      db.close();
      db = new SQL.Database(new Uint8Array(snapshot));
      db.run('PRAGMA foreign_keys = ON;');
      if (!inMemory) {
        assertRequiredBaseSchema(db);
        const version = schemaVersion(db);
        if (version !== SCHEMA_VERSION) {
          throw new Error('DATABASE_RESTORE_SCHEMA_INVALID');
        }
        assertF03Schema(db);
      }
    },

    close() {
      if (!inMemory) save();
      db.close();
    },
  };

  if (existing) {
    const version = schemaVersion(db);
    if (version === 4) {
      const originalBytes = fs.readFileSync(filename);
      if (!Buffer.from(originalBytes).equals(Buffer.from(db.export()))) {
        const originalDb = new SQL.Database(new Uint8Array(originalBytes));
        const originalVersion = schemaVersion(originalDb);
        originalDb.close();
        if (originalVersion === 3) {
          save();
        }
      }
    }
  }

  return database;
}

module.exports = {
  DB_FILE,
  SCHEMA_VERSION,
  createDatabase,
};
