'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDatabase } = require('../src/core/database');
const { createRawEventStore } = require('../src/core/raw-event-store');
const { BlockCursor } = require('../src/core/block-cursor');

function tempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-f03c-'));
  return {
    dir,
    file: path.join(dir, 'evidence.sqlite'),
  };
}

function rawRecord(block) {
  return {
    event_id: `event-${block}`,
    chain_id: 4663,
    block_number: block,
    transaction_hash: `0x${String(block).padStart(64, '0')}`,
    log_index: 0,
    address: '0x0000000000000000000000000000000000000001',
    topics: [],
    data: '0x',
    captured_at: '2026-09-21T00:00:00.000Z',
  };
}

test('F-03C actual sql.js persistence survives crash before cursor commit', async () => {
  const { dir, file } = tempDbPath();

  try {
    const db1 = await createDatabase(file);
    const store1 = createRawEventStore(db1.db);

    const cursorState = {
      version: 1,
      lastProcessedBlock: 10,
      status: 'RUNNING',
      lastError: null,
      updatedAt: null,
    };

    let persistedCursor = { ...cursorState };
    const cursor1 = new BlockCursor({
      loadState: () => ({ ...persistedCursor }),
      saveState: (next) => { persistedCursor = { ...next }; },
    });

    store1.insert(rawRecord(11));
    db1.save();

    // Crash boundary: evidence is durable, cursor commit never happens.
    assert.equal(store1.count(), 1);
    assert.equal(cursor1.get(), 10);
    assert.equal(persistedCursor.lastProcessedBlock, 10);

    db1.close();

    // Restart from the same durable database.
    const db2 = await createDatabase(file);
    const store2 = createRawEventStore(db2.db);

    assert.equal(store2.count(), 1);

    const restartedCursor = new BlockCursor({
      loadState: () => ({ ...persistedCursor }),
      saveState: (next) => { persistedCursor = { ...next }; },
    });

    assert.equal(restartedCursor.get(), 10);

    // Replay is idempotent: same event identity is not duplicated.
    const replay = store2.insert(rawRecord(11));
    assert.equal(replay.inserted, false);
    assert.equal(store2.count(), 1);

    // Only after replay/verification may the cursor advance.
    restartedCursor.advance(11);
    assert.equal(restartedCursor.get(), 11);
    assert.equal(persistedCursor.lastProcessedBlock, 11);

    db2.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('F-03C failed evidence persistence leaves cursor at the prior boundary', async () => {
  const { dir, file } = tempDbPath();

  try {
    const db = await createDatabase(file);
    const cursorState = {
      version: 1,
      lastProcessedBlock: 20,
      status: 'RUNNING',
      lastError: null,
      updatedAt: null,
    };

    let persistedCursor = { ...cursorState };
    const cursor = new BlockCursor({
      loadState: () => ({ ...persistedCursor }),
      saveState: (next) => { persistedCursor = { ...next }; },
    });

    const store = createRawEventStore(db.db);
    const before = cursor.get();

    assert.throws(() => store.insert(null), /RAW_EVENT_REQUIRED/);

    assert.equal(cursor.get(), before);
    assert.equal(persistedCursor.lastProcessedBlock, 20);
    db.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
