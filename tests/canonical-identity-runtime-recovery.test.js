'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { appendUnique } = require('../src/core/raw-store');
const { createDatabase } = require('../src/core/database');
const { createRawEventStore } = require('../src/core/raw-event-store');
const { createRawEventRecord } = require('../src/index');

test('runtime raw projection preserves canonical identity fields', () => {
  const log = {
    blockNumber: 64986697,
    blockHash: '0x' + 'a'.repeat(64),
    transactionHash: '0x' + 'b'.repeat(64),
    transactionIndex: 3,
    index: 7,
    address: '0x' + 'c'.repeat(40),
    topics: ['0x' + 'd'.repeat(64)],
    data: '0xdeadbeef',
  };

  const record = createRawEventRecord(log, 4663, '4663:64986697:tx:7');

  assert.equal(record.block_hash, log.blockHash);
  assert.equal(record.transaction_index, log.transactionIndex);
  assert.equal(record.transaction_hash, log.transactionHash);
  assert.equal(record.log_index, log.index);
  assert.equal(record.chain_id, 4663);
});

test('runtime raw projection preserves explicit null identity fields', () => {
  const log = {
    blockNumber: 10,
    transactionHash: '0x' + 'b'.repeat(64),
    index: 1,
    address: '0x' + 'c'.repeat(40),
    topics: [],
    data: '0x',
  };

  const record = createRawEventRecord(log, 4663, 'id');

  assert.equal(record.block_hash, null);
  assert.equal(record.transaction_index, null);
});

test('preserved raw acquisition can be reconciled into SQLite idempotently', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-recovery-'));
  const rawFile = path.join(dir, 'raw-events.jsonl');
  const dbFile = path.join(dir, 'state.sqlite');

  const log = {
    blockNumber: 100,
    blockHash: '0x' + 'a'.repeat(64),
    transactionHash: '0x' + 'b'.repeat(64),
    transactionIndex: 2,
    index: 4,
    address: '0x' + 'c'.repeat(40),
    topics: ['0x' + 'd'.repeat(64)],
    data: '0xdeadbeef',
  };

  const first = appendUnique(log, 4663, { rawFile, dataDir: dir });
  assert.equal(first.inserted, true);

  const retry = appendUnique(log, 4663, { rawFile, dataDir: dir });
  assert.equal(retry.inserted, false);

  const database = await createDatabase(dbFile);
  const store = createRawEventStore(database.db);
  const record = createRawEventRecord(log, 4663, retry.eventId);
  const result = store.insert(record);

  assert.equal(result.inserted, true);
  const rows = database.db.exec(
    'SELECT block_hash, transaction_index FROM raw_events WHERE event_id = ?',
    [retry.eventId]
  );
  assert.deepEqual(rows[0].values[0], [log.blockHash, log.transactionIndex]);

  database.close();
});
