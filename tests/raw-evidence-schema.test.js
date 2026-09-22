'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDatabase } = require('../src/core/database');
const { appendUnique } = require('../src/core/raw-store');

function tempDatabasePath() {
  return path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-schema-')),
    'test.sqlite'
  );
}

test('raw evidence schema exposes canonical block location fields', async () => {
  const database = await createDatabase(tempDatabasePath());

  const columns = database.db.exec('PRAGMA table_info(raw_events)')[0].values;
  const names = columns.map(row => row[1]);

  assert.ok(names.includes('block_hash'));
  assert.ok(names.includes('transaction_index'));

  const version = database.db.exec(
    "SELECT value FROM schema_meta WHERE key = 'schema_version'"
  )[0].values[0][0];

  assert.equal(version, '2');
  database.close();
});

test('raw store preserves block hash and transaction index', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-raw-'));
  const rawFile = path.join(dir, 'raw-events.jsonl');

  const previousDir = process.env.HAHAWEEK_DATA_DIR;
  const previousFile = process.env.HAHAWEEK_RAW_FILE;
  process.env.HAHAWEEK_DATA_DIR = dir;
  process.env.HAHAWEEK_RAW_FILE = rawFile;

  try {
    const result = appendUnique({
      blockNumber: 123,
      blockHash: '0x' + 'a'.repeat(64),
      transactionHash: '0x' + 'b'.repeat(64),
      transactionIndex: 4,
      index: 7,
      address: '0x' + 'c'.repeat(40),
      topics: ['0x' + 'd'.repeat(64)],
      data: '0x',
    }, 4663);

    assert.equal(result.inserted, true);

    const record = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
    assert.equal(record.block_hash, '0x' + 'a'.repeat(64));
    assert.equal(record.transaction_index, 4);
  } finally {
    if (previousDir === undefined) delete process.env.HAHAWEEK_DATA_DIR;
    else process.env.HAHAWEEK_DATA_DIR = previousDir;

    if (previousFile === undefined) delete process.env.HAHAWEEK_RAW_FILE;
    else process.env.HAHAWEEK_RAW_FILE = previousFile;
  }
});
