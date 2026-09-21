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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hahaweek-f02c-crash-"));
  return { db: path.join(dir, "evidence.sqlite"), state: path.join(dir, "state.json") };
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
  return { async getBlockNumber() { return latestBlock; } };
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

test("F-02C crash boundary: durable evidence survives while cursor remains behind", async () => {
  const p = tempPaths();
  const stateStore = makeStateStore(p.state);
  const database = await createDatabase(p.db);
  const raw = createRawEventStore(database.db);
  const cursor = new BlockCursor({ loadState: stateStore.load, saveState: stateStore.save });

  cursor.initialize(100);

  const engine = new IngestionEngine({
    provider: makeProvider(101),
    cursor,
    confirmations: 0,
    processor: async () => {},
    processorRange: async (from) => {
      raw.insert(rawRecord("CRASH-E1", from));

      // This is the critical durability boundary:
      // evidence is committed before the cursor is allowed to advance.
      database.save();

      // Simulate process death/failure after evidence commit and before cursor commit.
      throw new Error("SIMULATED_CRASH_AFTER_EVIDENCE_COMMIT");
    },
    batchSize: 1,
  });

  await assert.rejects(
    () => engine.runOnce(),
    /SIMULATED_CRASH_AFTER_EVIDENCE_COMMIT/,
  );

  // The failed checkpoint must not advance the cursor.
  assert.equal(cursor.get(), 100);
  assert.equal(stateStore.get().lastProcessedBlock, 100);
  database.db.close();

  // Restart from durable database + durable cursor state.
  const restartedDatabase = await createDatabase(p.db);
  const rows = restartedDatabase.db.exec(
    "SELECT event_id, block_number FROM raw_events WHERE event_id = 'CRASH-E1'"
  );
  assert.deepEqual(rows[0].values, [["CRASH-E1", 101]]);

  const restartedCursor = new BlockCursor({
    loadState: stateStore.load,
    saveState: stateStore.save,
  });
  assert.equal(restartedCursor.get(), 100);

  // Replay must be safe: same identity is not duplicated.
  const restartedRaw = createRawEventStore(restartedDatabase.db);
  const replay = restartedRaw.insert(rawRecord("CRASH-E1", 101));
  assert.equal(replay.inserted, false);
  assert.equal(restartedRaw.count(), 1);

  restartedDatabase.close();
});
