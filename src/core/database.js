'use strict';

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { createLegacyWriteBarrier } = require('./legacy-write-freeze');

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'hahaweek.sqlite');
const SCHEMA_VERSION = 8;

const CANONICAL_DECISION_DDL = {
  records: [
    'CREATE TABLE canonical_block_decisions (',
    '  record_digest TEXT PRIMARY KEY,',
    '  chain_id INTEGER NOT NULL,',
    '  block_number INTEGER NOT NULL,',
    '  block_hash TEXT NOT NULL,',
    '  parent_block_hash TEXT NOT NULL,',
    '  decision_head_block INTEGER NOT NULL,',
    '  confirmation_depth INTEGER NOT NULL,',
    '  source_id TEXT NOT NULL,',
    '  acquired_at TEXT NOT NULL,',
    '  CHECK (chain_id >= 0),',
    '  CHECK (block_number >= 0),',
    '  CHECK (decision_head_block >= 0),',
    '  CHECK (confirmation_depth >= 0),',
    '  UNIQUE (chain_id, block_number, block_hash)',
    ');',
  ].join('\n'),
  snapshots: [
    'CREATE TABLE canonical_decision_snapshots (',
    '  snapshot_id TEXT PRIMARY KEY,',
    '  chain_id INTEGER NOT NULL,',
    '  from_block INTEGER NOT NULL,',
    '  to_block INTEGER NOT NULL,',
    '  decision_head_block INTEGER NOT NULL,',
    '  confirmation_depth INTEGER NOT NULL,',
    '  source_id TEXT NOT NULL,',
    '  created_at TEXT NOT NULL,',
    '  CHECK (chain_id >= 0),',
    '  CHECK (from_block >= 0),',
    '  CHECK (to_block >= 0),',
    '  CHECK (from_block <= to_block),',
    '  CHECK (decision_head_block >= 0),',
    '  CHECK (confirmation_depth >= 0)',
    ');',
  ].join('\n'),
  blocks: [
    'CREATE TABLE canonical_decision_snapshot_blocks (',
    '  snapshot_id TEXT NOT NULL,',
    '  ordinal INTEGER NOT NULL,',
    '  block_number INTEGER NOT NULL,',
    '  record_digest TEXT NOT NULL,',
    '  block_hash TEXT NOT NULL,',
    '  PRIMARY KEY (snapshot_id, ordinal),',
    '  UNIQUE (snapshot_id, block_number),',
    '  FOREIGN KEY (snapshot_id) REFERENCES canonical_decision_snapshots(snapshot_id),',
    '  FOREIGN KEY (record_digest) REFERENCES canonical_block_decisions(record_digest)',
    ');',
  ].join('\n'),
};

const PRODUCTION_AUTHORITY_LIFECYCLE_DDL = {
  table: [
    'CREATE TABLE production_authority_lifecycle (',
    '  authority_lifecycle_id TEXT PRIMARY KEY,',
    "  state TEXT NOT NULL CHECK (state = 'DURABLY_ESTABLISHED'),",
    '  segment_id TEXT NOT NULL,',
    '  manifest_digest TEXT NOT NULL,',
    '  checkpoint_digest TEXT NOT NULL,',
    '  generation TEXT NOT NULL,',
    '  cursor_block INTEGER NOT NULL,',
    '  binding_digest TEXT NOT NULL,',
    '  processing_result_id TEXT NOT NULL,',
    '  processing_execution_id TEXT NOT NULL,',
    '  lineage_id TEXT NOT NULL,',
    '  canonical_decision_snapshot_id TEXT NOT NULL,',
    '  evidence_set_digest TEXT NOT NULL,',
    '  from_block INTEGER NOT NULL,',
    '  to_block INTEGER NOT NULL,',
    '  expected_segment_id TEXT NOT NULL,',
    '  expected_manifest_digest TEXT NOT NULL,',
    '  expected_checkpoint_digest TEXT NOT NULL,',
    '  source_id TEXT NOT NULL,',
    '  predecessor_lifecycle_id TEXT NULL,',
    '  replacement_type TEXT NULL,',
    '  establishment_input_digest TEXT NOT NULL,',
    '  committed_at TEXT NOT NULL,',
    '  CHECK (from_block >= 0),',
    '  CHECK (to_block >= 0),',
    '  CHECK (from_block <= to_block),',
    '  CHECK (cursor_block = to_block),',
    "  CHECK (replacement_type IS NULL OR replacement_type = 'REORG_REPLACEMENT'),",
    '  UNIQUE (establishment_input_digest)',
    ');',
  ].join('\n')
  ].join('\n'),
  triggers: [
    "CREATE TRIGGER production_authority_lifecycle_no_update BEFORE UPDATE ON production_authority_lifecycle BEGIN SELECT RAISE(ABORT, 'PRODUCTION_AUTHORITY_LIFECYCLE_APPEND_ONLY'); END;",
    "CREATE TRIGGER production_authority_lifecycle_no_delete BEFORE DELETE ON production_authority_lifecycle BEGIN SELECT RAISE(ABORT, 'PRODUCTION_AUTHORITY_LIFECYCLE_APPEND_ONLY'); END;",
  ].join('\n'),
};

const RUNTIME_LINEAGE_DDL = {
  transitions: [
    'CREATE TABLE canonical_transitions (',
    '  transition_id TEXT PRIMARY KEY,',
    '  evidence_id TEXT NOT NULL,',
    '  from_state TEXT NOT NULL,',
    '  to_state TEXT NOT NULL,',
    '  sequence TEXT NOT NULL,',
    '  previous_transition_hash TEXT NULL,',
    '  transition_hash TEXT NOT NULL UNIQUE,',
    '  provenance_json TEXT NOT NULL,',
    '  committed_at TEXT NOT NULL,',
    "  CHECK (from_state IN ('OBSERVED','CANONICAL','ORPHANED')),",
    "  CHECK (to_state IN ('OBSERVED','CANONICAL','ORPHANED')),",
    "  CHECK ((from_state = 'OBSERVED' AND to_state = 'CANONICAL') OR (from_state = 'CANONICAL' AND to_state = 'ORPHANED')),",
    "  CHECK (length(sequence) > 0 AND sequence NOT GLOB '*[^0-9]*'),",
    '  UNIQUE (evidence_id, sequence)',
    ');',
  ].join('\n'),
  lineage: [
    'CREATE TABLE canonical_lineage (',
    '  lineage_id TEXT PRIMARY KEY,',
    '  from_block INTEGER NOT NULL,',
    '  to_block INTEGER NOT NULL,',
    '  processing_result_id TEXT NOT NULL UNIQUE,',
    '  parent_result_id TEXT NULL,',
    '  transition_type TEXT NOT NULL,',
    '  generation TEXT NOT NULL,',
    '  canonical_evidence_set_digest TEXT NOT NULL,',
    '  provenance_json TEXT NOT NULL,',
    '  committed_at TEXT NOT NULL,',
    '  CHECK (from_block >= 0),',
    '  CHECK (to_block >= 0),',
    '  CHECK (from_block <= to_block),',
    "  CHECK (transition_type IN ('INITIAL','CONTINUATION','REORG_REPLACEMENT'))",
    ');',
  ].join('\n'),
  triggers: [
    "CREATE TRIGGER canonical_transitions_no_update BEFORE UPDATE ON canonical_transitions BEGIN SELECT RAISE(ABORT, 'CANONICAL_TRANSITIONS_APPEND_ONLY'); END;",
    "CREATE TRIGGER canonical_transitions_no_delete BEFORE DELETE ON canonical_transitions BEGIN SELECT RAISE(ABORT, 'CANONICAL_TRANSITIONS_APPEND_ONLY'); END;",
    "CREATE TRIGGER canonical_lineage_no_update BEFORE UPDATE ON canonical_lineage BEGIN SELECT RAISE(ABORT, 'CANONICAL_LINEAGE_APPEND_ONLY'); END;",
    "CREATE TRIGGER canonical_lineage_no_delete BEFORE DELETE ON canonical_lineage BEGIN SELECT RAISE(ABORT, 'CANONICAL_LINEAGE_APPEND_ONLY'); END;",
  ].join('\n'),
};

const PROCESSING_RESULT_DDL = {
  results: [
    'CREATE TABLE processing_results (',
    '  result_id TEXT PRIMARY KEY,',
    '  processing_execution_id TEXT NOT NULL,',
    '  parent_result_id TEXT NULL,',
    '  transition_type TEXT NOT NULL,',
    '  from_block INTEGER NOT NULL,',
    '  to_block INTEGER NOT NULL,',
    '  generation TEXT NOT NULL,',
    '  status TEXT NOT NULL,',
    '  canonicality_status TEXT NOT NULL,',
    '  empty_result INTEGER NOT NULL,',
    '  evidence_set_digest TEXT NOT NULL,',
    '  provenance_json TEXT NOT NULL,',
    '  committed_at TEXT NOT NULL,',
    '  CHECK (from_block >= 0),',
    '  CHECK (to_block >= 0),',
    '  CHECK (from_block <= to_block),',
    '  CHECK (empty_result IN (0,1)),',
    "  CHECK (status = 'ACCEPTED'),",
    "  CHECK (canonicality_status = 'CANONICAL'),",
    "  CHECK (transition_type IN ('INITIAL','CONTINUATION','REORG_REPLACEMENT')),",
    '  UNIQUE (processing_execution_id),',
    '  FOREIGN KEY (parent_result_id) REFERENCES processing_results(result_id)',
    ');',
  ].join('\n'),
  evidence: [
    'CREATE TABLE processing_result_evidence (',
    '  result_id TEXT NOT NULL,',
    '  ordinal INTEGER NOT NULL,',
    '  evidence_id TEXT NOT NULL,',
    '  raw_event_id TEXT NOT NULL,',
    '  identity_hash TEXT NOT NULL,',
    '  raw_hash TEXT NOT NULL,',
    '  canonical_hash TEXT NOT NULL,',
    '  block_number INTEGER NOT NULL,',
    '  transaction_index INTEGER NOT NULL,',
    '  log_index INTEGER NOT NULL,',
    '  PRIMARY KEY (result_id, ordinal),',
    '  FOREIGN KEY (result_id) REFERENCES processing_results(result_id),',
    '  FOREIGN KEY (evidence_id) REFERENCES canonical_evidence(evidence_id),',
    '  FOREIGN KEY (raw_event_id) REFERENCES raw_events(event_id),',
    '  UNIQUE (result_id, evidence_id)',
    ');',
  ].join('\n'),
};

const F03_DDL = {
  segments: [
    'CREATE TABLE f03_segments (',
    '  segment_id TEXT PRIMARY KEY,',
    '  from_block INTEGER NOT NULL,',
    '  to_block INTEGER NOT NULL,',
    '  segment_digest TEXT NOT NULL,',
    '  generation TEXT NOT NULL,',
    '  provenance_json TEXT NOT NULL,',
    '  committed_at TEXT NOT NULL,',
    '  CHECK (from_block >= 0),',
    '  CHECK (to_block >= 0),',
    '  CHECK (from_block <= to_block),',
    '  UNIQUE (segment_id, segment_digest)',
    ');',
  ].join('\n'),
  manifests: [
    'CREATE TABLE f03_manifests (',
    '  manifest_id TEXT PRIMARY KEY,',
    '  manifest_digest TEXT NOT NULL,',
    '  generation TEXT NOT NULL,',
    '  segment_id TEXT NOT NULL,',
    '  segment_digest TEXT NOT NULL,',
    '  provenance_json TEXT NOT NULL,',
    '  committed_at TEXT NOT NULL,',
    '  UNIQUE (manifest_id, manifest_digest),',
    '  FOREIGN KEY (segment_id, segment_digest)',
    '    REFERENCES f03_segments(segment_id, segment_digest)',
    ');',
  ].join('\n'),
  checkpoints: [
    'CREATE TABLE f03_checkpoints (',
    '  checkpoint_digest TEXT PRIMARY KEY,',
    '  generation TEXT NOT NULL,',
    '  manifest_id TEXT NOT NULL,',
    '  manifest_digest TEXT NOT NULL,',
    '  provenance_json TEXT NOT NULL,',
    '  committed_at TEXT NOT NULL,',
    '  FOREIGN KEY (manifest_id, manifest_digest)',
    '    REFERENCES f03_manifests(manifest_id, manifest_digest)',
    ');',
  ].join('\n'),
};

function normalizeSql(sql) {
  return String(sql || '').replace(/\s+/g, ' ').trim().toUpperCase();
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
  if (typeof actualSql !== 'string' || !actualSql.toUpperCase().includes('CREATE TABLE ' + tableName.toUpperCase())) {
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
      { table: 'f03_segments', from: 'segment_digest', to: 'segment_digest' },
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
      { table: 'f03_manifests', from: 'manifest_digest', to: 'manifest_digest' },
    ]
  );

  const segmentForeignKeys = db.exec('PRAGMA foreign_key_list(f03_segments)')[0]?.values ?? [];
  if (segmentForeignKeys.length !== 0) {
    throw new Error('F03_TABLE_FOREIGN_KEYS_INVALID_F03_SEGMENTS');
  }
}

function createBaseSchema(db) {
  db.run([
    'CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);',
    'CREATE TABLE raw_events (event_id TEXT PRIMARY KEY, chain_id INTEGER NOT NULL, block_number INTEGER NOT NULL, transaction_hash TEXT NOT NULL, block_hash TEXT, transaction_index INTEGER, log_index INTEGER NOT NULL, address TEXT NOT NULL, topics_json TEXT NOT NULL, data TEXT NOT NULL, captured_at TEXT NOT NULL);',
    'CREATE TABLE pools (pool_id TEXT PRIMARY KEY, chain_id INTEGER NOT NULL, pool_manager TEXT NOT NULL, currency0 TEXT NOT NULL, currency1 TEXT NOT NULL, fee INTEGER NOT NULL, tick_spacing INTEGER NOT NULL, hooks TEXT NOT NULL, block_number INTEGER NOT NULL, transaction_hash TEXT NOT NULL, log_index INTEGER NOT NULL, created_at TEXT NOT NULL);',
    'CREATE TABLE liquidity_events (event_id TEXT PRIMARY KEY, chain_id INTEGER NOT NULL, pool_id TEXT NOT NULL, pool_manager TEXT NOT NULL, sender TEXT NOT NULL, tick_lower INTEGER NOT NULL, tick_upper INTEGER NOT NULL, liquidity_delta TEXT NOT NULL, salt TEXT NOT NULL, block_number INTEGER NOT NULL, transaction_hash TEXT NOT NULL, log_index INTEGER NOT NULL, captured_at TEXT NOT NULL);',
    'CREATE TABLE flow_windows (chain_id INTEGER NOT NULL, pool_id TEXT NOT NULL, window_start INTEGER NOT NULL, window_end INTEGER NOT NULL, swap_count INTEGER NOT NULL, unique_sender_count INTEGER NOT NULL, total_amount0 TEXT NOT NULL, total_amount1 TEXT NOT NULL, first_block INTEGER NOT NULL, last_block INTEGER NOT NULL, first_timestamp INTEGER NOT NULL, last_timestamp INTEGER NOT NULL, PRIMARY KEY (chain_id, pool_id, window_start));',
    'CREATE TABLE ingestion_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);',
    'CREATE TABLE canonical_evidence (evidence_id TEXT PRIMARY KEY, identity_schema_version TEXT NOT NULL, identity_hash TEXT NOT NULL, raw_event_id TEXT NOT NULL, raw_hash TEXT NOT NULL, canonical_hash TEXT NOT NULL, canonical_json TEXT NOT NULL, interpretation_status TEXT NOT NULL, provenance_json TEXT NOT NULL, stored_at TEXT NOT NULL, FOREIGN KEY (raw_event_id) REFERENCES raw_events(event_id));',
    "INSERT INTO schema_meta (key, value) VALUES ('schema_version', '7');",
    F03_DDL.segments,
    F03_DDL.manifests,
    F03_DDL.checkpoints,
    PROCESSING_RESULT_DDL.results,
    PROCESSING_RESULT_DDL.evidence,
    CANONICAL_DECISION_DDL.records,
    CANONICAL_DECISION_DDL.snapshots,
    CANONICAL_DECISION_DDL.blocks,
    RUNTIME_LINEAGE_DDL.transitions,
    RUNTIME_LINEAGE_DDL.lineage,
    RUNTIME_LINEAGE_DDL.triggers,
    PRODUCTION_AUTHORITY_LIFECYCLE_DDL.table,
    PRODUCTION_AUTHORITY_LIFECYCLE_DDL.triggers,
  ].join('\n'));
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

function migrateV5ToV6(db) {
  assertRequiredBaseSchema(db);
  assertF03Schema(db);
  assertProcessingResultSchema(db);
  db.run('BEGIN');
  let committed = false;
  try {
    db.run(CANONICAL_DECISION_DDL.records);
    db.run(CANONICAL_DECISION_DDL.snapshots);
    db.run(CANONICAL_DECISION_DDL.blocks);
    db.run("UPDATE schema_meta SET value = '6' WHERE key = 'schema_version'");
    db.run('COMMIT');
    committed = true;
  } finally {
    if (!committed) {
      try { db.run('ROLLBACK'); } catch {}
    }
  }
}

function migrateV6ToV7(db) {
  assertRequiredBaseSchema(db);
  assertF03Schema(db);
  assertProcessingResultSchema(db);
  assertCanonicalDecisionSchema(db);
  db.run('BEGIN');
  let committed = false;
  try {
    db.run(RUNTIME_LINEAGE_DDL.transitions);
    db.run(RUNTIME_LINEAGE_DDL.lineage);
    db.run(RUNTIME_LINEAGE_DDL.triggers);
    db.run("UPDATE schema_meta SET value = '7' WHERE key = 'schema_version'");
    db.run('COMMIT');
    committed = true;
  } finally {
    if (!committed) {
      try { db.run('ROLLBACK'); } catch {}
    }
  }
}

function assertCanonicalDecisionTable(db, tableName, expectedColumns, expectedForeignKeys = []) {
  if (!hasTable(db, tableName)) throw new Error('CANONICAL_DECISION_TABLE_MISSING_' + tableName.toUpperCase());
  const columns = db.exec('PRAGMA table_info(' + tableName + ')')[0]?.values ?? [];
  if (columns.length !== expectedColumns.length || columns.some((c, i) =>
    c[1] !== expectedColumns[i][0] || c[2] !== expectedColumns[i][1] ||
    c[3] !== expectedColumns[i][2] || c[5] !== expectedColumns[i][3]
  )) {
    throw new Error('CANONICAL_DECISION_SCHEMA_INVALID_' + tableName.toUpperCase());
  }
  const foreignKeys = db.exec('PRAGMA foreign_key_list(' + tableName + ')')[0]?.values ?? [];
  if (foreignKeys.length !== expectedForeignKeys.length) {
    throw new Error('CANONICAL_DECISION_FOREIGN_KEYS_INVALID_' + tableName.toUpperCase());
  }
  for (const expected of expectedForeignKeys) {
    const found = foreignKeys.some(row => row[2] === expected.table && row[3] === expected.from && row[4] === expected.to);
    if (!found) throw new Error('CANONICAL_DECISION_FOREIGN_KEYS_INVALID_' + tableName.toUpperCase());
  }
}

function assertRuntimeLineageTable(db, tableName, expectedColumns, expectedForeignKeys = []) {
  if (!hasTable(db, tableName)) throw new Error('RUNTIME_LINEAGE_TABLE_MISSING_' + tableName.toUpperCase());
  const columns = db.exec('PRAGMA table_info(' + tableName + ')')[0]?.values ?? [];
  if (columns.length !== expectedColumns.length || columns.some((c, i) =>
    c[1] !== expectedColumns[i][0] || c[2] !== expectedColumns[i][1] ||
    c[3] !== expectedColumns[i][2] || c[5] !== expectedColumns[i][3]
  )) {
    throw new Error('RUNTIME_LINEAGE_SCHEMA_INVALID_' + tableName.toUpperCase());
  }
  const foreignKeys = db.exec('PRAGMA foreign_key_list(' + tableName + ')')[0]?.values ?? [];
  if (foreignKeys.length !== expectedForeignKeys.length) throw new Error('RUNTIME_LINEAGE_FOREIGN_KEYS_INVALID_' + tableName.toUpperCase());
}

function migrateV7ToV8(db) {
  assertRequiredBaseSchema(db);
  assertF03Schema(db);
  assertProcessingResultSchema(db);
  assertCanonicalDecisionSchema(db);
  assertRuntimeLineageSchema(db);
  db.run('BEGIN');
  let committed = false;
  try {
    db.run(PRODUCTION_AUTHORITY_LIFECYCLE_DDL.table);
    db.run(PRODUCTION_AUTHORITY_LIFECYCLE_DDL.triggers);
    db.run("UPDATE schema_meta SET value = '8' WHERE key = 'schema_version'");
    db.run('COMMIT');
    committed = true;
  } finally {
    if (!committed) {
      try { db.run('ROLLBACK'); } catch {}
    }
  }
}

function assertProductionAuthorityLifecycleSchema(db) {
  if (!hasTable(db, 'production_authority_lifecycle')) throw new Error('PRODUCTION_AUTHORITY_LIFECYCLE_TABLE_MISSING');
  const columns = db.exec('PRAGMA table_info(production_authority_lifecycle)')[0]?.values ?? [];
  const expected = [
    ['authority_lifecycle_id','TEXT',0,1],['state','TEXT',1,0],['segment_id','TEXT',1,0],['manifest_digest','TEXT',1,0],['checkpoint_digest','TEXT',1,0],
    ['generation','TEXT',1,0],['cursor_block','INTEGER',1,0],['binding_digest','TEXT',1,0],['processing_result_id','TEXT',1,0],['processing_execution_id','TEXT',1,0],
    ['lineage_id','TEXT',1,0],['canonical_decision_snapshot_id','TEXT',1,0],['evidence_set_digest','TEXT',1,0],['from_block','INTEGER',1,0],['to_block','INTEGER',1,0],
    ['expected_segment_id','TEXT',1,0],['expected_manifest_digest','TEXT',1,0],['expected_checkpoint_digest','TEXT',1,0],['source_id','TEXT',1,0],['predecessor_lifecycle_id','TEXT',0,0],
    ['replacement_type','TEXT',0,0],['establishment_input_digest','TEXT',1,0],['committed_at','TEXT',1,0],
  ];
  if (columns.length !== expected.length || columns.some((c,i) => c[1] !== expected[i][0] || c[2] !== expected[i][1] || c[3] !== expected[i][2] || c[5] !== expected[i][3])) throw new Error('PRODUCTION_AUTHORITY_LIFECYCLE_SCHEMA_INVALID');
  const triggers = db.exec("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN ('production_authority_lifecycle_no_update','production_authority_lifecycle_no_delete')")[0]?.values ?? [];
  if (triggers.length !== 2) throw new Error('PRODUCTION_AUTHORITY_LIFECYCLE_APPEND_ONLY_TRIGGERS_MISSING');
}

function assertRuntimeLineageSchema(db) {
  assertRuntimeLineageTable(db, 'canonical_transitions', [
    ['transition_id','TEXT',0,1],['evidence_id','TEXT',1,0],['from_state','TEXT',1,0],
    ['to_state','TEXT',1,0],['sequence','TEXT',1,0],['previous_transition_hash','TEXT',0,0],
    ['transition_hash','TEXT',1,0],['provenance_json','TEXT',1,0],['committed_at','TEXT',1,0],
  ]);
  assertRuntimeLineageTable(db, 'canonical_lineage', [
    ['lineage_id','TEXT',0,1],['from_block','INTEGER',1,0],['to_block','INTEGER',1,0],
    ['processing_result_id','TEXT',1,0],['parent_result_id','TEXT',0,0],['transition_type','TEXT',1,0],
    ['generation','TEXT',1,0],['canonical_evidence_set_digest','TEXT',1,0],
    ['provenance_json','TEXT',1,0],['committed_at','TEXT',1,0],
  ]);
  const triggers = db.exec("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN ('canonical_transitions_no_update','canonical_transitions_no_delete','canonical_lineage_no_update','canonical_lineage_no_delete')")[0]?.values ?? [];
  if (triggers.length !== 4) throw new Error('RUNTIME_LINEAGE_APPEND_ONLY_TRIGGERS_MISSING');
}

function assertCanonicalDecisionSchema(db) {
  assertCanonicalDecisionTable(db, 'canonical_block_decisions', [
    ['record_digest','TEXT',0,1],['chain_id','INTEGER',1,0],['block_number','INTEGER',1,0],
    ['block_hash','TEXT',1,0],['parent_block_hash','TEXT',1,0],['decision_head_block','INTEGER',1,0],
    ['confirmation_depth','INTEGER',1,0],['source_id','TEXT',1,0],['acquired_at','TEXT',1,0],
  ]);
  assertCanonicalDecisionTable(db, 'canonical_decision_snapshots', [
    ['snapshot_id','TEXT',0,1],['chain_id','INTEGER',1,0],['from_block','INTEGER',1,0],
    ['to_block','INTEGER',1,0],['decision_head_block','INTEGER',1,0],['confirmation_depth','INTEGER',1,0],
    ['source_id','TEXT',1,0],['created_at','TEXT',1,0],
  ]);
  assertCanonicalDecisionTable(db, 'canonical_decision_snapshot_blocks', [
    ['snapshot_id','TEXT',1,1],['ordinal','INTEGER',1,2],['block_number','INTEGER',1,0],
    ['record_digest','TEXT',1,0],['block_hash','TEXT',1,0],
  ], [
    { table: 'canonical_decision_snapshots', from: 'snapshot_id', to: 'snapshot_id' },
    { table: 'canonical_block_decisions', from: 'record_digest', to: 'record_digest' },
  ]);
}

function migrateV4ToV5(db) {
  assertRequiredBaseSchema(db);
  assertF03Schema(db);
  db.run('BEGIN');
  let committed = false;
  try {
    db.run(PROCESSING_RESULT_DDL.results);
    db.run(PROCESSING_RESULT_DDL.evidence);
    db.run("UPDATE schema_meta SET value = '5' WHERE key = 'schema_version'");
    db.run('COMMIT');
    committed = true;
  } finally {
    if (!committed) {
      try { db.run('ROLLBACK'); } catch {}
    }
  }
}

function assertProcessingResultSchema(db) {
  if (!hasTable(db, 'processing_results') || !hasTable(db, 'processing_result_evidence')) {
    throw new Error('PROCESSING_RESULT_TABLE_MISSING');
  }
  const resultColumns = db.exec('PRAGMA table_info(processing_results)')[0]?.values ?? [];
  const expectedResult = [
    ['result_id','TEXT',0,1],['processing_execution_id','TEXT',1,0],['parent_result_id','TEXT',0,0],
    ['transition_type','TEXT',1,0],['from_block','INTEGER',1,0],['to_block','INTEGER',1,0],
    ['generation','TEXT',1,0],['status','TEXT',1,0],['canonicality_status','TEXT',1,0],
    ['empty_result','INTEGER',1,0],['evidence_set_digest','TEXT',1,0],['provenance_json','TEXT',1,0],
    ['committed_at','TEXT',1,0],
  ];
  if (resultColumns.length !== expectedResult.length ||
      resultColumns.some((c,i) => c[1] !== expectedResult[i][0] || c[2] !== expectedResult[i][1] || c[3] !== expectedResult[i][2] || c[5] !== expectedResult[i][3])) {
    throw new Error('PROCESSING_RESULT_SCHEMA_INVALID');
  }
  const evidenceColumns = db.exec('PRAGMA table_info(processing_result_evidence)')[0]?.values ?? [];
  const expectedEvidence = [
    ['result_id','TEXT',1,1],['ordinal','INTEGER',1,2],['evidence_id','TEXT',1,0],['raw_event_id','TEXT',1,0],
    ['identity_hash','TEXT',1,0],['raw_hash','TEXT',1,0],['canonical_hash','TEXT',1,0],
    ['block_number','INTEGER',1,0],['transaction_index','INTEGER',1,0],['log_index','INTEGER',1,0],
  ];
  if (evidenceColumns.length !== expectedEvidence.length ||
      evidenceColumns.some((c,i) => c[1] !== expectedEvidence[i][0] || c[2] !== expectedEvidence[i][1] || c[3] !== expectedEvidence[i][2] || c[5] !== expectedEvidence[i][3])) {
    throw new Error('PROCESSING_RESULT_EVIDENCE_SCHEMA_INVALID');
  }
}

async function createDatabase(filename = DB_FILE, options = {}) {
  const legacyWriteBarrier =
    options.legacyWriteBarrier || createLegacyWriteBarrier();

  fs.mkdirSync(path.dirname(filename), { recursive: true });

  const SQL = await initSqlJs({
    locateFile: file =>
      path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
  });

  let db;
  const inMemory = filename === ':memory:';
  const existing = !inMemory && fs.existsSync(filename);

  if (inMemory) db = new SQL.Database();
  else if (existing) db = new SQL.Database(new Uint8Array(fs.readFileSync(filename)));
  else db = new SQL.Database();

  db.run('PRAGMA foreign_keys = ON;');

  const hasMeta = hasTable(db, 'schema_meta');

  if (!hasMeta) {
    if (existing) throw new Error('SCHEMA_VERSION_MISSING');
    createBaseSchema(db);
    assertF03Schema(db);
    assertProcessingResultSchema(db);
    assertCanonicalDecisionSchema(db);
  } else {
    const version = schemaVersion(db);

    if (version === 3) {
      migrateV3ToV4(db);
      migrateV4ToV5(db);
      assertProcessingResultSchema(db);
      migrateV5ToV6(db);
      assertCanonicalDecisionSchema(db);
      migrateV6ToV7(db);
      assertRuntimeLineageSchema(db);
    } else if (version === 4) {
      migrateV4ToV5(db);
      migrateV5ToV6(db);
      assertCanonicalDecisionSchema(db);
      migrateV6ToV7(db);
      assertRuntimeLineageSchema(db);
    } else if (version === 5) {
      assertRequiredBaseSchema(db);
      assertF03Schema(db);
      assertProcessingResultSchema(db);
      migrateV5ToV6(db);
      assertCanonicalDecisionSchema(db);
      migrateV6ToV7(db);
      assertRuntimeLineageSchema(db);
    } else if (version === 6) {
      assertRequiredBaseSchema(db);
      assertF03Schema(db);
      assertProcessingResultSchema(db);
      assertCanonicalDecisionSchema(db);
      migrateV6ToV7(db);
      assertRuntimeLineageSchema(db);
    } else if (version === 7) {
      assertRequiredBaseSchema(db);
      assertF03Schema(db);
      assertProcessingResultSchema(db);
      assertCanonicalDecisionSchema(db);
      assertRuntimeLineageSchema(db);
      migrateV7ToV8(db);
      assertProductionAuthorityLifecycleSchema(db);
    } else {
      throw new Error('UNSUPPORTED_SCHEMA_VERSION');
    }
  }

  const isReadOnlyStatement = sql => {
    const normalized = String(sql).trim().toUpperCase();
    return normalized.startsWith('SELECT ')
      || normalized.startsWith('SELECT\n')
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
      if (!isReadOnlyStatement(sql)) legacyWriteBarrier.assertWritable();
      const statement = db.prepare(sql, ...args);
      return {
        bind: (...bindArgs) => statement.bind(...bindArgs),
        run: (...runArgs) => {
          legacyWriteBarrier.assertWritable();
          return statement.run(...runArgs);
        },
        step: (...stepArgs) => {
          if (!isReadOnlyStatement(sql)) legacyWriteBarrier.assertWritable();
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
      try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}
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
        if (schemaVersion(db) !== SCHEMA_VERSION) {
          throw new Error('DATABASE_RESTORE_SCHEMA_INVALID');
        }
        assertF03Schema(db);
        assertProcessingResultSchema(db);
        assertCanonicalDecisionSchema(db);
        assertRuntimeLineageSchema(db);
        assertProductionAuthorityLifecycleSchema(db);
      }
    },
    close() {
      if (!inMemory) save();
      db.close();
    },
  };

  if (existing) {
    const originalBytes = fs.readFileSync(filename);
    const originalDb = new SQL.Database(new Uint8Array(originalBytes));
    const originalVersion = hasTable(originalDb, 'schema_meta') ? schemaVersion(originalDb) : null;
    originalDb.close();

    if (originalVersion === 3) {
      save();
    }
  }

  return database;
}

module.exports = {
  DB_FILE,
  SCHEMA_VERSION,
  createDatabase,
};
