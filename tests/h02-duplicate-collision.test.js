'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDatabase } = require('../src/core/database');
const { createRawEventStore } = require('../src/core/raw-event-store');
const { appendUnique } = require('../src/core/raw-store');

function tempPath(name) {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-h02-')), name);
}

function event(id, data = '0xdata') {
  return {
    event_id: id,
    chain_id: 4663,
    block_number: 100,
    transaction_hash: '0x' + '1'.repeat(64),
    block_hash: '0x' + '2'.repeat(64),
    transaction_index: 0,
    log_index: 0,
    address: '0x0000000000000000000000000000000000000001',
    topics: ['0xtopic'],
    data,
    captured_at: '2026-01-01T00:00:00.000Z',
  };
}

test('raw SQLite duplicate with same digest is explicitly idempotent', async () => {
  const filename = tempPath('events.sqlite');
  const database = await createDatabase(filename);
  const store = createRawEventStore(database.db);

  const first = store.insert(event('same'));
  const second = store.insert(event('same'));

  assert.equal(first.status, 'INSERTED');
  assert.equal(second.status, 'IDEMPOTENT');
  assert.equal(first.digest, second.digest);
  assert.equal(store.count(), 1);

  database.close();
});

test('raw SQLite duplicate with different digest is an integrity conflict', async () => {
  const filename = tempPath('events.sqlite');
  const database = await createDatabase(filename);
  const store = createRawEventStore(database.db);

  store.insert(event('collision', '0xaaa'));

  assert.throws(
    () => store.insert(event('collision', '0xbbb')),
    /INTEGRITY_CONFLICT/
  );
  assert.equal(store.count(), 1);

  database.close();
});

test('raw JSONL duplicate with same digest is explicitly idempotent', () => {
  const rawFile = tempPath('raw-events.jsonl');
  const first = appendUnique(event('same-jsonl'), 4663, { rawFile });
  const second = appendUnique(event('same-jsonl'), 4663, { rawFile });

  assert.equal(first.status, 'INSERTED');
  assert.equal(second.status, 'IDEMPOTENT');
  assert.equal(first.digest, second.digest);
  assert.equal(fs.readFileSync(rawFile, 'utf8').split('\n').filter(Boolean).length, 1);
});

test('raw JSONL duplicate with different digest is an integrity conflict', () => {
  const rawFile = tempPath('raw-events.jsonl');
  appendUnique(event('collision-jsonl', '0xaaa'), 4663, { rawFile });

  assert.throws(
    () => appendUnique(event('collision-jsonl', '0xbbb'), 4663, { rawFile }),
    /INTEGRITY_CONFLICT/
  );
  assert.equal(fs.readFileSync(rawFile, 'utf8').split('\n').filter(Boolean).length, 1);
});
