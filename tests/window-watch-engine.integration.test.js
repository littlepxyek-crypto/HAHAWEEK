'use strict';

/*
 * Window-watch through the REAL live path, offline: createEngine(mode window)
 * with a fake chain provider -> verified processing context (headers +
 * linkage + raw logs + lineage) -> F-03 / authority gate -> cursor.
 * Then restart reconciliation from disk.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-window-engine-'));
process.env.HAHAWEEK_DATA_DIR = DATA_DIR;
process.env.HAHAWEEK_WRITER_LEASE_MS = '30000';
for (const name of ['HAHAWEEK_STATE_FILE', 'HAHAWEEK_DB_FILE', 'HAHAWEEK_RAW_FILE', 'HAHAWEEK_WRITER_FENCE_FILE', 'HAHAWEEK_LEGACY_FREEZE_FILE', 'HAHAWEEK_START_BLOCK', 'HAHAWEEK_MODE']) {
  delete process.env[name];
}

const { createEngine } = require('../src/index');
const { listGaps } = require('../src/core/window-ledger');
const { evaluateEvidenceCoverage } = require('../src/core/evidence-coverage');
const { POOL_MANAGER } = require('../src/core/pool-discovery');
const { TOPIC0: INITIALIZE_TOPIC0 } = require('../src/core/initialize-decoder');
const { STATE_FILE } = require('../src/core/state');

const HEAD = 1003; // safe head 1000 with the default 3 confirmations
const hash = n => '0x' + n.toString(16).padStart(64, '0');

function fakeProvider({ failLogsAt = null } = {}) {
  return {
    async getNetwork() { return { chainId: 4663n }; },
    async getBlockNumber() { return HEAD; },
    async getBlock(number) {
      if (!Number.isSafeInteger(number) || number > HEAD) return null;
      return { number, hash: hash(number + 1), parentHash: hash(number), timestamp: 1700000000 + number };
    },
    async getLogs(filter) {
      if (failLogsAt !== null && filter.fromBlock <= failLogsAt && failLogsAt <= filter.toBlock) {
        const error = new Error('RPC_UNAVAILABLE');
        error.code = 'RPC_UNAVAILABLE';
        throw error;
      }
      // One Initialize-shaped log at block 300 (enough to make a non-empty segment).
      if (filter.fromBlock <= 300 && 300 <= filter.toBlock) {
        return [{
          blockNumber: 300,
          blockHash: hash(301),
          transactionHash: '0x' + 'ab'.repeat(32),
          transactionIndex: 0,
          index: 0,
          address: POOL_MANAGER,
          topics: [INITIALIZE_TOPIC0, '0x' + '11'.repeat(32), '0x' + '00'.repeat(12) + '22'.repeat(20), '0x' + '00'.repeat(12) + '33'.repeat(20)],
          data: '0x' + '00'.repeat(160),
        }];
      }
      return [];
    },
    destroy() {},
  };
}

async function withEngine(options, fn) {
  const engine = await createEngine({ mode: 'window', providerFactory: () => fakeProvider(options), ...options.engine });
  try {
    return await fn(engine);
  } finally {
    engine.database.close();
    await engine.writerFence.stopWatchdog();
    engine.writerFence.release();
  }
}

const plan = segments => () => ({ horizon: 1000, discoveryScannedThrough: 1000, segments });

test('window segments go through verified context + authority; gaps recorded; INITIAL after every gap', async () => {
  await withEngine({}, async (engine) => {
    engine.setWindowPlanner(plan([
      { fromBlock: 100, toBlock: 104 },
      { fromBlock: 300, toBlock: 304 },
      { fromBlock: 901, toBlock: 950 },
      { fromBlock: 951, toBlock: 1000 },
    ]));
    const result = await engine.ingestion.runOnce();
    assert.equal(result.cursor, 1000);
    assert.equal(result.authorityOutcome.status, 'AUTHORIZED');
    assert.deepEqual(result.segments.map(s => s.transitionType), ['INITIAL', 'INITIAL', 'INITIAL', 'CONTINUATION']);
    assert.deepEqual(listGaps(engine.database).map(g => [g.startBlock, g.endBlock]), [[105, 299], [305, 900]]);

    const lineages = engine.database.db.exec('SELECT from_block, to_block, transition_type, parent_result_id FROM canonical_lineage ORDER BY from_block')[0].values;
    assert.equal(lineages.length, 4);
    assert.equal(lineages[1][3], null, 'segment after a gap has no parent (no continuity claimed)');
    assert.notEqual(lineages[3][3], null, 'adjacent segment continues its parent');

    assert.equal(evaluateEvidenceCoverage({ database: engine.database, fromBlock: 100, toBlock: 1000 }).status, 'PARTIAL');
    assert.equal(evaluateEvidenceCoverage({ database: engine.database, fromBlock: 300, toBlock: 304 }).status, 'COMPLETE');
    assert.equal(evaluateEvidenceCoverage({ database: engine.database, fromBlock: 0, toBlock: 104 }).status, 'UNKNOWN');
    const raw = engine.database.db.exec('SELECT COUNT(*) FROM raw_events')[0].values[0][0];
    assert.equal(raw, 1);
  });
});

test('restart: reconciliation accepts a cursor jump only over the exactly recorded gap', async () => {
  // Simulate a crash after the 300-304 and 901-1000 lifecycles were committed
  // but before the cursor advanced: cursor back at 104.
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...state, lastProcessedBlock: 104 }));
  await withEngine({}, async (engine) => {
    assert.equal(engine.ingestion.cursor.get(), 1000, 'reconciled forward across recorded gaps');
  });

  // Contiguous mode (no gap source) must fail closed on the same data.
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...state, lastProcessedBlock: 104 }));
  await assert.rejects(
    () => createEngine({ mode: 'contiguous', providerFactory: () => fakeProvider() }),
    /LIFECYCLE_RECONCILIATION_RANGE_GAP/
  );
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...state, lastProcessedBlock: 1000 }));
});

test('restart after reconciliation: an empty plan is a no-op and keeps the cursor', async () => {
  await withEngine({}, async (engine) => {
    // Cursor is 1000 from the first test; plan beyond needs a higher head, so
    // reuse a fresh planner that targets nothing new.
    engine.setWindowPlanner(() => ({ horizon: 1000, discoveryScannedThrough: 1000, segments: [] }));
    const result = await engine.ingestion.runOnce();
    assert.equal(result.processed, 0);
    assert.equal(result.cursor, 1000);
  });
});

test('failure mid-pass (fresh DB): getLogs error leaves the cursor on the previous segment', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-window-fail-'));
  const { spawnSync } = require('node:child_process');
  const script = `
    const { createEngine } = require(${JSON.stringify(path.join(__dirname, '..', 'src', 'index.js'))});
    const hash = n => '0x' + n.toString(16).padStart(64, '0');
    const provider = {
      async getNetwork() { return { chainId: 4663n }; },
      async getBlockNumber() { return 1003; },
      async getBlock(n) { return { number: n, hash: hash(n + 1), parentHash: hash(n), timestamp: n }; },
      async getLogs(f) { if (f.fromBlock <= 500 && 500 <= f.toBlock) { const e = new Error('RPC_UNAVAILABLE'); e.code = 'RPC_UNAVAILABLE'; throw e; } return []; },
      destroy() {},
    };
    (async () => {
      const engine = await createEngine({ mode: 'window', providerFactory: () => provider });
      engine.setWindowPlanner(() => ({ horizon: 1000, discoveryScannedThrough: 1000, segments: [
        { fromBlock: 100, toBlock: 104 }, { fromBlock: 500, toBlock: 504 }, { fromBlock: 900, toBlock: 904 } ] }));
      let error = null;
      try { await engine.ingestion.runOnce(); } catch (e) { error = e.message; }
      const cursor = engine.ingestion.cursor.get();
      const lifecycles = engine.database.db.exec('SELECT from_block FROM production_authority_lifecycle')[0].values.map(r => r[0]);
      engine.database.close(); await engine.writerFence.stopWatchdog(); engine.writerFence.release();
      console.log(JSON.stringify({ error, cursor, lifecycles }));
    })();
  `;
  const out = spawnSync(process.execPath, ['-e', script], {
    env: { ...process.env, HAHAWEEK_DATA_DIR: dir },
    encoding: 'utf8',
  });
  assert.equal(out.status, 0, out.stderr);
  const result = JSON.parse(out.stdout.trim().split('\n').pop());
  assert.match(result.error, /RPC_UNAVAILABLE/);
  assert.equal(result.cursor, 104);
  assert.deepEqual(result.lifecycles, [100]);
});
