'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createDatabase } = require('../src/core/database');
const { createWriterFence } = require('../src/core/single-writer-fence');
const { createVerifiedProcessingContext } = require('../src/core/runtime-processing-context');
const { createF03ExpectedAuthorityEstablisher } = require('../src/core/f03-runtime-establishment');
const { readF03AuthorityChain } = require('../src/core/f03-authoritative-chain-persistence');

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
    captured_at: '2026-09-27T08:00:00.000Z',
  };
}

async function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-f03-establish-'));
  const database = await createDatabase(path.join(dir, 'hahaweek.sqlite'));
  const fence = createWriterFence({
    filename: path.join(dir, 'writer-fence-state.json'),
    ownerId: 'f03-establish-owner',
    now: () => 1000,
    leaseMs: 10000,
  });
  fence.acquire();
  return { dir, database, fence };
}

function providerFor(chain) {
  return {
    async getNetwork() { return { chainId: 4663n }; },
    async getBlockNumber() { return 103; },
    async getBlock(number) {
      const row = chain[number];
      if (!row) throw new Error('BLOCK_FIXTURE_MISSING_' + number);
      return { number, hash: row.hash, parentHash: row.parentHash, chainId: 4663 };
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
        [r.event_id, r.chain_id, r.block_number, r.transaction_hash, r.block_hash, r.transaction_index,
          r.log_index, r.address, JSON.stringify(r.topics), r.data, r.captured_at]
      );
    }
  };
}

async function emptyContextFor(fixtureState) {
  const chain = {
    99: { hash: HASH(99), parentHash: HASH(98) },
    100: { hash: HASH(100), parentHash: HASH(99) },
  };
  return createVerifiedProcessingContext({
    database: fixtureState.database,
    provider: providerFor(chain),
    writerFence: fixtureState.fence,
    confirmations: 3,
    chainId: 4663,
    fromBlock: 100,
    toBlock: 100,
    latestBlock: 103,
    rawIngest: rawIngestor(fixtureState.database, {}),
    committedAt: '2026-09-27T08:01:00.000Z',
  });
}

async function contextFor(fixtureState) {
  const chain = {
    99: { hash: HASH(99), parentHash: HASH(98) },
    100: { hash: HASH(100), parentHash: HASH(99) },
  };
  return createVerifiedProcessingContext({
    database: fixtureState.database,
    provider: providerFor(chain),
    writerFence: fixtureState.fence,
    confirmations: 3,
    chainId: 4663,
    fromBlock: 100,
    toBlock: 100,
    latestBlock: 103,
    rawIngest: rawIngestor(fixtureState.database, { 100: raw('e100', 100, HASH(100)) }),
    committedAt: '2026-09-27T08:01:00.000Z',
  });
}

test('F03 establishment creates the exact durable chain from verified context', async () => {
  const f = await fixture();
  try {
    const context = await contextFor(f);
    const establish = createF03ExpectedAuthorityEstablisher({ database: f.database, writerFence: f.fence });
    const authority = establish({ fromBlock: 100, toBlock: 100, processingContext: context });

    assert.equal(authority.status, 'VERIFIED');
    assert.equal(authority.fromBlock, 100);
    assert.equal(authority.toBlock, 100);
    assert.equal(authority.generation, context.generation);
    assert.equal(authority.cursorBlock, 100);
    assert.equal(readF03AuthorityChain({ database: f.database, fromBlock: 100, toBlock: 100 }).segmentId, authority.segmentId);
  } finally {
    f.database.close(); f.fence.release(); fs.rmSync(f.dir, { recursive: true, force: true });
  }
});

test('F03 establishment explicitly supports a VERIFIED empty result without advancing the cursor', async () => {
  const f = await fixture();
  try {
    const context = await emptyContextFor(f);
    assert.equal(context.status, 'VERIFIED');
    assert.deepEqual(context.canonicalEvidenceIds, []);
    assert.equal(context.emptyResult, true);

    const establish = createF03ExpectedAuthorityEstablisher({ database: f.database, writerFence: f.fence });
    const authority = establish({ fromBlock: 100, toBlock: 100, processingContext: context });

    assert.equal(authority.status, 'VERIFIED');
    assert.equal(authority.fromBlock, 100);
    assert.equal(authority.toBlock, 100);
    assert.equal(authority.cursorBlock, 100);
    assert.equal(f.database.db.exec('SELECT COUNT(*) FROM f03_segments')[0].values[0][0], 1);
    assert.equal(f.database.db.exec('SELECT COUNT(*) FROM f03_manifests')[0].values[0][0], 1);
    assert.equal(f.database.db.exec('SELECT COUNT(*) FROM f03_checkpoints')[0].values[0][0], 1);
  } finally {
    f.database.close(); f.fence.release(); fs.rmSync(f.dir, { recursive: true, force: true });
  }
});

test('F03 establishment is idempotent and does not rewrite a valid chain', async () => {
  const f = await fixture();
  try {
    const context = await contextFor(f);
    const establish = createF03ExpectedAuthorityEstablisher({ database: f.database, writerFence: f.fence });
    const first = establish({ fromBlock: 100, toBlock: 100, processingContext: context });
    const second = establish({ fromBlock: 100, toBlock: 100, processingContext: context });
    assert.deepEqual(second, first);
    assert.equal(f.database.db.exec('SELECT COUNT(*) FROM f03_segments')[0].values[0][0], 1);
  } finally {
    f.database.close(); f.fence.release(); fs.rmSync(f.dir, { recursive: true, force: true });
  }
});

test('F03 establishment fails closed on range mismatch', async () => {
  const f = await fixture();
  try {
    const context = await contextFor(f);
    const establish = createF03ExpectedAuthorityEstablisher({ database: f.database, writerFence: f.fence });
    assert.throws(
      () => establish({ fromBlock: 99, toBlock: 100, processingContext: context }),
      /F03_ESTABLISHMENT_RANGE_MISMATCH/
    );
    assert.equal(f.database.db.exec('SELECT COUNT(*) FROM f03_segments')[0].values[0][0], 0);
  } finally {
    f.database.close(); f.fence.release(); fs.rmSync(f.dir, { recursive: true, force: true });
  }
});

test('F03 establishment fails closed when evidence is corrupted', async () => {
  const f = await fixture();
  try {
    const context = await contextFor(f);
    f.database.db.run(
      'UPDATE canonical_evidence SET canonical_hash = ? WHERE evidence_id = ?',
      ['f'.repeat(64), context.canonicalEvidenceIds[0]]
    );
    const establish = createF03ExpectedAuthorityEstablisher({ database: f.database, writerFence: f.fence });
    assert.throws(
      () => establish({ fromBlock: 100, toBlock: 100, processingContext: context }),
      /F03_ESTABLISHMENT_CANONICAL_EVIDENCE_CANONICAL_HASH_MISMATCH/
    );
    assert.equal(f.database.db.exec('SELECT COUNT(*) FROM f03_segments')[0].values[0][0], 0);
  } finally {
    f.database.close(); f.fence.release(); fs.rmSync(f.dir, { recursive: true, force: true });
  }
});

test('F03 establishment requires writer-fence ownership', async () => {
  const f = await fixture();
  try {
    const context = await contextFor(f);
    f.fence.release();
    const establish = createF03ExpectedAuthorityEstablisher({ database: f.database, writerFence: f.fence });
    assert.throws(
      () => establish({ fromBlock: 100, toBlock: 100, processingContext: context }),
      /WRITER_FENCE/
    );
  } finally {
    f.database.close(); fs.rmSync(f.dir, { recursive: true, force: true });
  }
});