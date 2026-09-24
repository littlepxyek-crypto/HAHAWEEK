'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createDatabase } = require('../src/core/database');
const { createRawEventStore } = require('../src/core/raw-event-store');
const { createLegacyWriteBarrier } = require('../src/core/legacy-write-freeze');
const { BlockCursor } = require('../src/core/block-cursor');
const { IngestionEngine } = require('../src/core/ingestion');
const { loadState, saveState } = require('../src/core/state');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-h04-'));
}

function event(blockNumber, id = 'recovery-event') {
  return {
    event_id: id,
    chain_id: 4663,
    block_number: blockNumber,
    transaction_hash: '0x' + '1'.repeat(64),
    block_hash: '0x' + '2'.repeat(64),
    transaction_index: 0,
    log_index: 0,
    address: '0x0000000000000000000000000000000000000001',
    topics: ['0xtopic'],
    data: '0xdata',
    captured_at: '2026-01-01T00:00:00.000Z',
  };
}

function provider(head) {
  return { async getBlockNumber() { return head; } };
}

test('H-04: evidence committed before cursor; restart replays idempotently', async () => {
  const dir = tempDir();
  const dbFile = path.join(dir, 'events.sqlite');
  const stateFile = path.join(dir, 'state.json');
  const freezeFile = path.join(dir, 'legacy-write-state.json');

  const barrier = createLegacyWriteBarrier({ filename: freezeFile });
  const database = await createDatabase(dbFile, { legacyWriteBarrier: barrier });
  const store = createRawEventStore(database.db, { legacyWriteBarrier: barrier });

  saveState({
    version: 1,
    lastProcessedBlock: 100,
    status: 'READY',
    lastError: null,
    updatedAt: null,
  }, { legacyWriteBarrier: barrier, stateFile });

  const firstCursor = new BlockCursor({
    loadState: () => loadStateWithFile(stateFile),
    saveState: state => saveState(state, { legacyWriteBarrier: barrier, stateFile }),
  });

  let injectedCrash = true;
  const firstEngine = new IngestionEngine({
    provider: provider(101),
    cursor: firstCursor,
    confirmations: 0,
    processor: async block => {
      store.insert(event(block));
      database.save();

      if (injectedCrash) {
        injectedCrash = false;
        throw new Error('SIMULATED_CRASH_AFTER_EVIDENCE_COMMIT');
      }
    },
  });

  await assert.rejects(
    () => firstEngine.runOnce(),
    /SIMULATED_CRASH_AFTER_EVIDENCE_COMMIT/
  );

  assert.equal(firstCursor.get(), 100);

  database.close();

  const restartedBarrier = createLegacyWriteBarrier({ filename: freezeFile });
  const restartedDatabase = await createDatabase(dbFile, {
    legacyWriteBarrier: restartedBarrier,
  });
  const restartedStore = createRawEventStore(
    restartedDatabase.db,
    { legacyWriteBarrier: restartedBarrier }
  );

  assert.equal(restartedStore.count(), 1);

  const restartCursor = new BlockCursor({
    loadState: () => loadStateWithFile(stateFile),
    saveState: state => saveState(
      state,
      { legacyWriteBarrier: restartedBarrier, stateFile }
    ),
  });

  let replayStatus = null;
  const secondEngine = new IngestionEngine({
    provider: provider(101),
    cursor: restartCursor,
    confirmations: 0,
    processor: async block => {
      replayStatus = restartedStore.insert(event(block)).status;
      restartedDatabase.save();
    },
  });

  const result = await secondEngine.runOnce();

  assert.equal(replayStatus, 'IDEMPOTENT');
  assert.equal(result.cursor, 101);
  assert.equal(loadStateWithFile(stateFile).lastProcessedBlock, 101);
  assert.equal(restartedStore.count(), 1);

  restartedDatabase.close();
});

test('H-04: evidence persistence failure prevents cursor advancement', async () => {
  const persisted = {
    version: 1,
    lastProcessedBlock: 100,
    status: 'READY',
    lastError: null,
    updatedAt: null,
  };

  const cursor = new BlockCursor({
    loadState: () => ({ ...persisted }),
    saveState: state => Object.assign(persisted, state),
  });

  const engine = new IngestionEngine({
    provider: provider(101),
    cursor,
    confirmations: 0,
    processor: async () => {
      throw new Error('EVIDENCE_COMMIT_FAILED');
    },
  });

  await assert.rejects(
    () => engine.runOnce(),
    /EVIDENCE_COMMIT_FAILED/
  );

  assert.equal(persisted.lastProcessedBlock, 100);
});

function loadStateWithFile(stateFile) {
  return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
}
