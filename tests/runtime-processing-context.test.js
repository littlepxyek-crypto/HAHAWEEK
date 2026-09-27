'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createDatabase } = require('../src/core/database');
const { createWriterFence } = require('../src/core/single-writer-fence');
const { createVerifiedProcessingContext } = require('../src/core/runtime-processing-context');

const HASH = n => '0x' + Number(n).toString(16).padStart(2, '0').repeat(32);

function raw(eventId, block, hash) {
  return {
    event_id: eventId,
    chain_id: 4663,
    block_number: block,
    transaction_hash: HASH(block + 50),
    block_hash: hash,
    transaction_index: 0,
    log_index: 0,
    address: '0x' + 'aa'.repeat(20),
    topics: [],
    data: '0x',
    captured_at: '2026-09-24T08:00:00.000Z',
  };
}

async function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-step590-'));
  const database = await createDatabase(path.join(dir, 'hahaweek.sqlite'));
  const fence = createWriterFence({
    filename: path.join(dir, 'writer-fence-state.json'),
    ownerId: 'step590-owner',
    now: () => 1000,
    leaseMs: 10000,
  });
  fence.acquire();
  return { database, fence, dir };
}

function providerFor(chain) {
  return {
    async getNetwork() { return { chainId: 4663n }; },
    async getBlockNumber() { return 103; },
    async getBlock(number) {
      const row = chain[number];
      if (!row) throw new Error('BLOCK_FIXTURE_MISSING_' + number);
      return {
        number,
        hash: row.hash,
        parentHash: row.parentHash,
        chainId: 4663,
      };
    },
  };
}

function rawIngestor(database, records) {
  return async (fromBlock, toBlock) => {
    for (let block = fromBlock; block <= toBlock; block += 1) {
      const r = records[block];
      if (!r) continue;
      database.db.run(
        'INSERT OR IGNORE INTO raw_events (event_id, chain_id, block_number, transaction_hash, block_hash, transaction_index, log_index, address, topics_json, data, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [r.event_id, r.chain_id, r.block_number, r.transaction_hash, r.block_hash,
          r.transaction_index, r.log_index, r.address, JSON.stringify(r.topics),
          r.data, r.captured_at]
      );
    }
  };
}

test('STEP590 INITIAL creates VERIFIED context with generation 1', async () => {
  const f = await fixture();
  const chain = {
    99: { hash: HASH(99), parentHash: HASH(98) },
    100: { hash: HASH(100), parentHash: HASH(99) },
  };
  const records = { 100: raw('e100', 100, HASH(100)) };

  const context = await createVerifiedProcessingContext({
    database: f.database,
    provider: providerFor(chain),
    writerFence: f.fence,
    confirmations: 3,
    chainId: 4663,
    fromBlock: 100,
    toBlock: 100,
    latestBlock: 103,
    rawIngest: rawIngestor(f.database, records),
    committedAt: '2026-09-24T08:01:00.000Z',
  });

  assert.equal(context.status, 'VERIFIED');
  assert.equal(context.transitionType, 'INITIAL');
  assert.equal(context.generation, '1');
  assert.equal(context.fromBlock, 100);
  assert.equal(context.toBlock, 100);
  assert.equal(context.canonicalDecisionSnapshotId.startsWith('cds:v1:'), true);
  assert.equal(context.processingResultId.startsWith('pr:v1:'), true);
  assert.equal(context.lineageId.startsWith('cl:v1:'), true);
});

test('STEP590 CONTINUATION reconstructs the accepted parent and inherits generation', async () => {
  const f = await fixture();
  const chain = {
    99: { hash: HASH(99), parentHash: HASH(98) },
    100: { hash: HASH(100), parentHash: HASH(99) },
    101: { hash: HASH(101), parentHash: HASH(100) },
  };
  const records = {
    100: raw('e100', 100, HASH(100)),
    101: raw('e101', 101, HASH(101)),
  };

  const initial = await createVerifiedProcessingContext({
    database: f.database,
    provider: providerFor(chain),
    writerFence: f.fence,
    confirmations: 3,
    chainId: 4663,
    fromBlock: 100,
    toBlock: 100,
    latestBlock: 103,
    rawIngest: rawIngestor(f.database, records),
    committedAt: '2026-09-24T08:01:00.000Z',
  });

  const continuation = await createVerifiedProcessingContext({
    database: f.database,
    provider: providerFor(chain),
    writerFence: f.fence,
    confirmations: 3,
    chainId: 4663,
    fromBlock: 101,
    toBlock: 101,
    latestBlock: 104,
    rawIngest: rawIngestor(f.database, records),
    committedAt: '2026-09-24T08:02:00.000Z',
  });

  assert.equal(continuation.status, 'VERIFIED');
  assert.equal(continuation.transitionType, 'CONTINUATION');
  assert.equal(continuation.parentResultId, initial.processingResultId);
  assert.equal(continuation.generation, initial.generation);
});

test('STEP590 fails closed when continuation has no persisted accepted parent', async () => {
  const f = await fixture();
  const chain = {
    99: { hash: HASH(99), parentHash: HASH(98) },
    100: { hash: HASH(100), parentHash: HASH(99) },
  };
  const records = { 100: raw('e100', 100, HASH(100)) };

  await assert.rejects(
    () => createVerifiedProcessingContext({
      database: f.database,
      provider: providerFor(chain),
      writerFence: f.fence,
      confirmations: 3,
      chainId: 4663,
      fromBlock: 100,
      toBlock: 100,
      latestBlock: 103,
      transitionType: 'CONTINUATION',
      rawIngest: rawIngestor(f.database, records),
      committedAt: '2026-09-24T08:01:00.000Z',
    }),
    /PROCESSING_CONTEXT_PARENT_MISSING|PROCESSING_RESULT_PARENT_NOT_FOUND/
  );
});


test('STEP614 recovers durable exact context before replay when provider head advances', async () => {
  const state = await fixture();
  const chain = {
    99: { hash: HASH(99), parentHash: HASH(98) },
    100: { hash: HASH(100), parentHash: HASH(99) },
  };
  const records = { 100: raw('e100', 100, HASH(100)) };

  const initial = await createVerifiedProcessingContext({
    database: state.database,
    provider: providerFor(chain),
    writerFence: state.fence,
    confirmations: 3,
    chainId: 4663,
    fromBlock: 100,
    toBlock: 100,
    latestBlock: 103,
    rawIngest: rawIngestor(state.database, records),
    committedAt: '2026-09-27T05:00:00.000Z',
  });

  state.database.close();
  state.fence.release();

  const reopened = await createDatabase(path.join(state.dir, 'hahaweek.sqlite'));
  const reopenedFence = createWriterFence({
    filename: path.join(state.dir, 'writer-fence-state.json'),
    ownerId: 'step614-recovery-owner',
    now: () => 2000,
    leaseMs: 10000,
  });
  reopenedFence.acquire();

  try {
    const recovered = await createVerifiedProcessingContext({
      database: reopened,
      provider: providerFor(chain),
      writerFence: reopenedFence,
      confirmations: 3,
      chainId: 4663,
      fromBlock: 100,
      toBlock: 100,
      latestBlock: 104,
      rawIngest: async () => {
        throw new Error('RECOVERY_RAW_INGEST_SHOULD_NOT_RUN');
      },
      committedAt: '2026-09-27T05:01:00.000Z',
    });

    assert.equal(recovered.processingResultId, initial.processingResultId);
    assert.equal(recovered.lineageId, initial.lineageId);
    assert.equal(recovered.canonicalDecisionSnapshotId, initial.canonicalDecisionSnapshotId);
    assert.equal(
      reopened.db.exec('SELECT COUNT(*) FROM canonical_block_decisions')[0].values[0][0],
      2
    );
    assert.equal(
      reopened.db.exec('SELECT COUNT(*) FROM canonical_lineage')[0].values[0][0],
      1
    );
  } finally {
    reopenedFence.release();
    reopened.close();
    fs.rmSync(state.dir, { recursive: true, force: true });
  }
});


test('STEP614 changed provider identity uses the existing reorg path', async () => {
  const state = await fixture();
  const original = {
    99: { hash: HASH(99), parentHash: HASH(98) },
    100: { hash: HASH(100), parentHash: HASH(99) },
  };
  const changed = {
    99: { hash: HASH(99), parentHash: HASH(98) },
    100: { hash: HASH(200), parentHash: HASH(99) },
  };

  const initial = await createVerifiedProcessingContext({
    database: state.database,
    provider: providerFor(original),
    writerFence: state.fence,
    confirmations: 3,
    chainId: 4663,
    fromBlock: 100,
    toBlock: 100,
    latestBlock: 103,
    rawIngest: rawIngestor(state.database, { 100: raw('e100', 100, HASH(100)) }),
    committedAt: '2026-09-27T05:02:00.000Z',
  });

  const changedContext = await createVerifiedProcessingContext({
    database: state.database,
    provider: providerFor(changed),
    writerFence: state.fence,
    confirmations: 3,
    chainId: 4663,
    fromBlock: 100,
    toBlock: 100,
    latestBlock: 103,
    rawIngest: rawIngestor(state.database, { 100: raw('e100-changed', 100, HASH(200)) }),
    committedAt: '2026-09-27T05:03:00.000Z',
  });

  assert.equal(changedContext.transitionType, 'REORG_REPLACEMENT');
  assert.equal(changedContext.parentResultId, initial.processingResultId);
  assert.equal(
    state.database.db.exec('SELECT COUNT(*) FROM canonical_lineage')[0].values[0][0],
    2
  );

  state.database.close();
  fs.rmSync(state.dir, { recursive: true, force: true });
});


test('STEP614 multiple durable exact lineages fail closed before replay', async () => {
  const state = await fixture();
  const original = {
    99: { hash: HASH(99), parentHash: HASH(98) },
    100: { hash: HASH(100), parentHash: HASH(99) },
  };
  const changed = {
    99: { hash: HASH(99), parentHash: HASH(98) },
    100: { hash: HASH(200), parentHash: HASH(99) },
  };

  await createVerifiedProcessingContext({
    database: state.database,
    provider: providerFor(original),
    writerFence: state.fence,
    confirmations: 3,
    chainId: 4663,
    fromBlock: 100,
    toBlock: 100,
    latestBlock: 103,
    rawIngest: rawIngestor(state.database, { 100: raw('e100', 100, HASH(100)) }),
    committedAt: '2026-09-27T05:04:00.000Z',
  });

  await createVerifiedProcessingContext({
    database: state.database,
    provider: providerFor(changed),
    writerFence: state.fence,
    confirmations: 3,
    chainId: 4663,
    fromBlock: 100,
    toBlock: 100,
    latestBlock: 103,
    rawIngest: rawIngestor(state.database, { 100: raw('e100-changed', 100, HASH(200)) }),
    committedAt: '2026-09-27T05:05:00.000Z',
  });

  await assert.rejects(
    () => createVerifiedProcessingContext({
      database: state.database,
      provider: providerFor(changed),
      writerFence: state.fence,
      confirmations: 3,
      chainId: 4663,
      fromBlock: 100,
      toBlock: 100,
      latestBlock: 104,
      rawIngest: async () => {
        throw new Error('RECOVERY_RAW_INGEST_SHOULD_NOT_RUN');
      },
      committedAt: '2026-09-27T05:06:00.000Z',
    }),
    error => error.code === 'PROCESSING_CONTEXT_DURABLE_LINEAGE_CONFLICT'
  );

  state.database.close();
  fs.rmSync(state.dir, { recursive: true, force: true });
});
