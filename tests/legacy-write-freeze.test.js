'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  DEFAULT_STATE,
  FROZEN_STATE,
  LegacyWriteFreezeError,
  createLegacyWriteBarrier,
} = require('../src/core/legacy-write-freeze');
const { appendUnique } = require('../src/core/raw-store');
const { createRawEventStore } = require('../src/core/raw-event-store');
const { createDatabase } = require('../src/core/database');
const { saveState } = require('../src/core/state');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-h01-'));
}

function logFixture() {
  return {
    blockNumber: 100,
    transactionHash: '0xtx',
    index: 0,
    address: '0xpool',
    topics: ['0xtopic'],
    data: '0xdata',
  };
}

test('H-01 barrier defaults active and persists LEGACY_FROZEN across reinitialization', () => {
  const dir = tempDir();
  const file = path.join(dir, 'legacy-write-state.json');

  const first = createLegacyWriteBarrier({ filename: file });
  assert.equal(first.getState(), DEFAULT_STATE);
  assert.equal(first.assertWritable(), true);
  assert.equal(first.freeze(), FROZEN_STATE);

  const second = createLegacyWriteBarrier({ filename: file });
  assert.equal(second.getState(), FROZEN_STATE);
  assert.throws(
    () => second.assertWritable(),
    error => error instanceof LegacyWriteFreezeError &&
      error.code === 'LEGACY_WRITES_FROZEN'
  );
});

test('H-01 malformed freeze state fails closed', () => {
  const dir = tempDir();
  const file = path.join(dir, 'legacy-write-state.json');
  fs.writeFileSync(file, JSON.stringify({ state: 'UNKNOWN' }));

  const barrier = createLegacyWriteBarrier({ filename: file });

  assert.throws(
    () => barrier.assertWritable(),
    error => error instanceof LegacyWriteFreezeError &&
      error.code === 'INVALID_LEGACY_WRITE_STATE'
  );
});

test('H-01 blocks raw JSONL mutation and preserves bytes', () => {
  const dir = tempDir();
  const rawFile = path.join(dir, 'raw-events.jsonl');
  const barrier = createLegacyWriteBarrier({
    filename: path.join(dir, 'legacy-write-state.json'),
  });

  const first = appendUnique(logFixture(), 4663, {
    rawFile,
    legacyWriteBarrier: barrier,
  });

  assert.equal(first.inserted, true);
  const before = fs.readFileSync(rawFile);

  barrier.freeze();

  assert.throws(
    () => appendUnique(
      {
        ...logFixture(),
        blockNumber: 101,
        transactionHash: '0xtx2',
      },
      4663,
      { rawFile, legacyWriteBarrier: barrier }
    ),
    /LEGACY_WRITES_FROZEN/
  );

  assert.deepEqual(fs.readFileSync(rawFile), before);
});

test('H-01 blocks raw SQLite mutation without changing existing rows', async () => {
  const dir = tempDir();
  const barrier = createLegacyWriteBarrier({
    filename: path.join(dir, 'legacy-write-state.json'),
  });

  const database = await createDatabase(':memory:', { legacyWriteBarrier: barrier });
  const store = createRawEventStore(database.db, { legacyWriteBarrier: barrier });

  assert.equal(
    store.insert({
      event_id: 'event-1',
      chain_id: 4663,
      block_number: 100,
      transaction_hash: '0xtx',
      log_index: 0,
      address: '0xpool',
      topics: [],
      data: '0x',
      captured_at: new Date().toISOString(),
    }).inserted,
    true
  );

  barrier.freeze();

  assert.throws(
    () => store.insert({
      event_id: 'event-2',
      chain_id: 4663,
      block_number: 101,
      transaction_hash: '0xtx2',
      log_index: 0,
      address: '0xpool',
      topics: [],
      data: '0x',
      captured_at: new Date().toISOString(),
    }),
    /LEGACY_WRITES_FROZEN/
  );

  assert.equal(store.count(), 1);
  database.db.close();
});

test('H-01 blocks database file persistence and preserves bytes', async () => {
  const dir = tempDir();
  const dbFile = path.join(dir, 'hahaweek.sqlite');
  const barrier = createLegacyWriteBarrier({
    filename: path.join(dir, 'legacy-write-state.json'),
  });

  const database = await createDatabase(dbFile, {
    legacyWriteBarrier: barrier,
  });

  database.db.run(
    "INSERT INTO schema_meta (key, value) VALUES ('test', 'before-freeze')"
  );
  database.save();
  const before = fs.readFileSync(dbFile);

  database.db.run(
    "INSERT INTO schema_meta (key, value) VALUES ('test2', 'blocked')"
  );
  barrier.freeze();

  assert.throws(() => database.save(), /LEGACY_WRITES_FROZEN/);
  assert.deepEqual(fs.readFileSync(dbFile), before);

  database.db.close();
});

test('H-01 blocks state persistence before filesystem mutation', () => {
  const dir = tempDir();
  const stateFile = path.join(dir, 'state.json');
  const barrier = createLegacyWriteBarrier({
    filename: path.join(dir, 'legacy-write-state.json'),
  });

  saveState(
    {
      version: 1,
      lastProcessedBlock: 100,
      status: 'IDLE',
      lastError: null,
      updatedAt: null,
    },
    { legacyWriteBarrier: barrier, stateFile }
  );

  const before = fs.readFileSync(stateFile);
  barrier.freeze();

  assert.throws(
    () => saveState(
      {
        version: 1,
        lastProcessedBlock: 101,
        status: 'RUNNING',
        lastError: null,
      },
      { legacyWriteBarrier: barrier, stateFile }
    ),
    /LEGACY_WRITES_FROZEN/
  );

  assert.deepEqual(fs.readFileSync(stateFile), before);
});
