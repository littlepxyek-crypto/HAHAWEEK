'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createDatabase } = require('../src/core/database');
const { BlockCursor } = require('../src/core/block-cursor');

function tempPaths() {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'hahaweek-f03-')
  );

  return {
    dir,
    database: path.join(dir, 'hahaweek.sqlite'),
  };
}

function makeStateStore(initial) {
  let state = { ...initial };

  return {
    loadState: () => ({ ...state }),
    saveState: next => {
      state = { ...next };
    },
    get state() {
      return { ...state };
    },
  };
}

function insertRawEvent(db, blockNumber, suffix) {
  db.run(
    `
      INSERT INTO raw_events (
        event_id,
        chain_id,
        block_number,
        transaction_hash,
        log_index,
        address,
        topics_json,
        data,
        captured_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      `4663:${blockNumber}:0x${suffix}:0`,
      4663,
      blockNumber,
      `0x${suffix}`,
      0,
      '0xpool',
      '["0xtopic"]',
      '0xdata',
      '2026-01-01T00:00:00.000Z',
    ]
  );
}

test('F-03 crash boundary: committed evidence cannot be outrun by cursor', async () => {
  const paths = tempPaths();

  const persistedState = {
    version: 1,
    lastProcessedBlock: 100,
    status: 'RUNNING',
    lastError: null,
    updatedAt: null,
  };

  const stateStore = makeStateStore(persistedState);

  /*
   * Batch 100 was already durably committed.
   */
  {
    const database = await createDatabase(paths.database);
    insertRawEvent(database.db, 100, 'aaa');
    database.save();
    database.close();
  }

  const cursor = new BlockCursor({
    loadState: stateStore.loadState,
    saveState: stateStore.saveState,
  });

  assert.equal(cursor.get(), 100);

  /*
   * Simulate the critical ordering boundary:
   *
   * evidence commit succeeds
   *       ↓
   * PROCESS CRASH
   *       ↓
   * cursor.advance(101) never executes
   */
  {
    const database = await createDatabase(paths.database);

    insertRawEvent(database.db, 101, 'bbb');
    database.save();

    // Deliberately do not advance the cursor.
    database.close();
  }

  /*
   * Restart: both durable stores are reconstructed independently.
   */
  const restartedDatabase =
    await createDatabase(paths.database);

  const restoredRows =
    restartedDatabase.db.exec(`
      SELECT block_number, event_id
      FROM raw_events
      ORDER BY block_number
    `);

  assert.deepEqual(
    restoredRows[0].values,
    [
      [100, '4663:100:0xaaa:0'],
      [101, '4663:101:0xbbb:0'],
    ]
  );

  const restartedCursor = new BlockCursor({
    loadState: stateStore.loadState,
    saveState: stateStore.saveState,
  });

  /*
   * The cursor must remain behind durable evidence.
   * This is safe replay, not cursor corruption.
   */
  assert.equal(restartedCursor.get(), 100);

  /*
   * Replay block 101 idempotently, then advance.
   */
  const replay =
    restartedDatabase.db.exec(`
      SELECT COUNT(*)
      FROM raw_events
      WHERE event_id = '4663:101:0xbbb:0'
    `);

  assert.equal(replay[0].values[0][0], 1);

  restartedCursor.advance(101);

  assert.equal(restartedCursor.get(), 101);

  restartedDatabase.close();

  fs.rmSync(paths.dir, {
    recursive: true,
    force: true,
  });
});
