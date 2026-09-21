"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createDatabase } = require("../src/core/database");
const { createRawEventStore } = require("../src/core/raw-event-store");
const { BlockCursor } = require("../src/core/block-cursor");
const { IngestionEngine } = require("../src/core/ingestion");

function tempPaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hahaweek-f02c-"));
  return {
    dir,
    db: path.join(dir, "evidence.sqlite"),
    state: path.join(dir, "state.json"),
  };
}

function makeStateStore(filename) {
  let state = {
    version: 1,
    lastProcessedBlock: null,
    status: "INITIALIZING",
    lastError: null,
    updatedAt: null,
  };

  return {
    load: () => ({ ...state }),
    save: (next) => {
      state = { ...next };
      fs.writeFileSync(filename, JSON.stringify(state));
    },
    get: () => ({ ...state }),
  };
}

function makeProvider(latestBlock) {
  return {
    async getBlockNumber() {
      return latestBlock;
    },
  };
}

function rawRecord(id, block) {
  return {
    event_id: id,
    chain_id: 4663,
    block_number: block,
    transaction_hash: `0x${id.padEnd(64, "0").slice(0, 64)}`,
    log_index: 0,
    address: "0x0000000000000000000000000000000000000001",
    topics: ["0x" + "1".repeat(64)],
    data: "0x",
    captured_at: "2026-09-21T00:00:00.000Z",
  };
}

test("F-02C successful batch persists evidence before cursor advances", async () => {
  const p = tempPaths();
  const stateStore = makeStateStore(p.state);
  const database = await createDatabase(p.db);
  const raw = createRawEventStore(database.db);

  const cursor = new BlockCursor({
    loadState: stateStore.load,
    saveState: stateStore.save,
  });

  cursor.initialize(100);

  const engine = new IngestionEngine({
    provider: makeProvider(101),
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async (from, to) => {
      raw.insert(rawRecord("E1", from));
      assert.equal(raw.count(), 1);
      database.save();
      assert.equal(cursor.get(), 100);
      assert.equal(to, 101);
    },
    batchSize: 1,
  });

  const result = await engine.runOnce();

  assert.equal(result.cursor, 101);
  assert.equal(stateStore.get().lastProcessedBlock, 101);

  database.close();

  const restarted = await createDatabase(p.db);
  const rows = restarted.db.exec("SELECT event_id, block_number FROM raw_events");
  assert.deepEqual(rows[0].values, [["E1", 101]]);
  restarted.close();
});

test("F-02C failed batch cannot advance cursor past uncommitted evidence", async () => {
  const p = tempPaths();
  const stateStore = makeStateStore(p.state);
  const database = await createDatabase(p.db);
  const raw = createRawEventStore(database.db);

  const cursor = new BlockCursor({
    loadState: stateStore.load,
    saveState: stateStore.save,
  });

  cursor.initialize(100);

  const engine = new IngestionEngine({
    provider: makeProvider(101),
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async (from) => {
      raw.insert(rawRecord("E1", from));
      throw new Error("SIMULATED_PROCESSOR_FAILURE");
    },
    batchSize: 1,
  });

  await assert.rejects(
    () => engine.runOnce(),
    /SIMULATED_PROCESSOR_FAILURE/,
  );

  assert.equal(cursor.get(), 100);
  assert.equal(stateStore.get().lastProcessedBlock, 100);

  database.close();

  const restarted = await createDatabase(p.db);
  const rows = restarted.db.exec("SELECT event_id, block_number FROM raw_events");
  assert.deepEqual(rows[0].values, [["E1", 101]]);
  restarted.close();

  const restartedCursor = new BlockCursor({
    loadState: stateStore.load,
    saveState: stateStore.save,
  });
  assert.equal(restartedCursor.get(), 100);
});

test("F-02C replay after failed batch is idempotent at raw-event persistence", async () => {
  const p = tempPaths();
  const stateStore = makeStateStore(p.state);
  const database = await createDatabase(p.db);
  const raw = createRawEventStore(database.db);
  const cursor = new BlockCursor({
    loadState: stateStore.load,
    saveState: stateStore.save,
  });
  cursor.initialize(100);

  const engine = new IngestionEngine({
    provider: makeProvider(101),
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async (from) => {
      raw.insert(rawRecord("E1", from));
      database.save();
    },
    batchSize: 1,
  });

  await engine.runOnce();
  assert.equal(cursor.get(), 101);

  const replay = raw.insert(rawRecord("E1", 101));
  assert.equal(replay.inserted, false);
  assert.equal(raw.count(), 1);

  database.close();
});

test("F-02C restart restores evidence and cursor from separate durability boundaries", async () => {
  const p = tempPaths();
  const stateStore = makeStateStore(p.state);
  const database = await createDatabase(p.db);
  const raw = createRawEventStore(database.db);
  const cursor = new BlockCursor({
    loadState: stateStore.load,
    saveState: stateStore.save,
  });

  cursor.initialize(100);
  raw.insert(rawRecord("E1", 101));
  database.save();
  cursor.advance(101);
  database.close();

  const restartedDatabase = await createDatabase(p.db);
  const restartedCursor = new BlockCursor({
    loadState: stateStore.load,
    saveState: stateStore.save,
  });

  assert.equal(restartedCursor.get(), 101);
  const rows = restartedDatabase.db.exec("SELECT COUNT(*) FROM raw_events");
  assert.equal(rows[0].values[0][0], 1);

  restartedDatabase.close();
});
