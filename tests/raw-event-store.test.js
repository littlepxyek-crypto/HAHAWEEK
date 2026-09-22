'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createDatabase,
} = require('../src/core/database');

const {
  createRawEventStore,
} = require('../src/core/raw-event-store');

function tempDatabasePath() {
  return path.join(
    fs.mkdtempSync(
      path.join(os.tmpdir(), 'hahaweek-raw-')
    ),
    'test.sqlite'
  );
}

function sampleEvent(id, block = 100) {
  return {
    event_id: id,
    chain_id: 4663,
    block_number: block,
    transaction_hash: `0x${id.slice(-6).padStart(6, '0')}`,
    block_hash: `0x${'b'.repeat(64)}`,
    transaction_index: 2,
    log_index: 0,
    address: '0x0000000000000000000000000000000000000001',
    topics: ['0xtopic'],
    data: '0xdata',
    captured_at: '2026-01-01T00:00:00.000Z',
  };
}

test('raw event inserts exactly once', async () => {
  const filename = tempDatabasePath();
  const database = await createDatabase(filename);
  const store = createRawEventStore(database.db);

  const event = sampleEvent('event-001');

  const first = store.insert(event);
  const second = store.insert(event);

  assert.equal(first.inserted, true);
  assert.equal(second.inserted, false);
  assert.equal(store.count(), 1);

  database.close();
});

test('different raw events remain distinct', async () => {
  const filename = tempDatabasePath();
  const database = await createDatabase(filename);
  const store = createRawEventStore(database.db);

  store.insert(sampleEvent('event-001', 100));
  store.insert(sampleEvent('event-002', 101));

  assert.equal(store.count(), 2);

  database.close();
});

test('raw event survives database reload', async () => {
  const filename = tempDatabasePath();

  const first = await createDatabase(filename);
  const store = createRawEventStore(first.db);

  store.insert(sampleEvent('event-003', 123));
  first.save();
  first.db.close();

  const second = await createDatabase(filename);

  const rows = second.db.exec(`
    SELECT
      event_id,
      chain_id,
      block_number,
      block_hash,
      transaction_index,
      log_index,
      topics_json,
      data
    FROM raw_events
    WHERE event_id = 'event-003'
  `);

  assert.equal(rows[0].values.length, 1);

  const row = rows[0].values[0];

  assert.equal(row[0], 'event-003');
  assert.equal(row[1], 4663);
  assert.equal(row[2], 123);
  assert.equal(row[3], `0x${'b'.repeat(64)}`);
  assert.equal(row[4], 2);
  assert.equal(row[5], 0);
  assert.equal(row[6], '["0xtopic"]');
  assert.equal(row[7], '0xdata');

  second.db.close();
});
