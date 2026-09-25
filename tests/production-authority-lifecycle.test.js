'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createDatabase, SCHEMA_VERSION } = require('../src/core/database');
const { createWriterFence } = require('../src/core/single-writer-fence');
const {
  establishProductionAuthorityLifecycle,
  readProductionAuthorityLifecycle,
} = require('../src/core/production-authority-lifecycle');

function context(overrides = {}) {
  return {
    status: 'VERIFIED',
    fromBlock: 101,
    toBlock: 110,
    processingResultId: 'result-101-110',
    processingExecutionId: 'execution-101-110',
    lineageId: 'lineage-101-110',
    canonicalDecisionSnapshotId: 'snapshot-101-110',
    evidenceSetDigest: 'e'.repeat(64),
    generation: '1',
    parentResultId: null,
    transitionType: 'INITIAL',
    ...overrides,
  };
}

function expected(overrides = {}) {
  return {
    status: 'VERIFIED',
    fromBlock: 101,
    toBlock: 110,
    segmentId: 'segment-101-110',
    manifestDigest: 'a'.repeat(64),
    checkpointDigest: '0x' + 'b'.repeat(64),
    generation: '1',
    cursorBlock: 110,
    ...overrides,
  };
}

function makeFence(dir) {
  return createWriterFence({
    filename: path.join(dir, 'writer-fence-state.json'),
    ownerId: 'test-owner',
    now: () => 1000,
    leaseMs: 30000,
  });
}

test('STEP 603 fresh database uses schema 8 and lifecycle is append-only', async () => {
  const database = await createDatabase(':memory:');
  try {
    assert.equal(SCHEMA_VERSION, 8);
    const tables = database.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='production_authority_lifecycle'");
    assert.equal(tables[0].values.length, 1);
    const triggers = database.db.exec("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'production_authority_lifecycle_no_%'");
    assert.equal(triggers[0].values.length, 2);
  } finally {
    database.close();
  }
});

test('STEP 603 establishes and deterministically reuses lifecycle authority', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-lifecycle-'));
  const database = await createDatabase(':memory:');
  const fence = makeFence(dir);
  fence.acquire();
  try {
    const first = establishProductionAuthorityLifecycle({
      database,
      writerFence: fence,
      processingContext: context(),
      expectedAuthority: expected(),
    });
    const second = establishProductionAuthorityLifecycle({
      database,
      writerFence: fence,
      processingContext: context(),
      expectedAuthority: expected(),
    });

    assert.deepEqual(second, first);
    const rows = database.db.exec('SELECT COUNT(*) FROM production_authority_lifecycle');
    assert.equal(rows[0].values[0][0], 1);

    const id = database.db.exec('SELECT authority_lifecycle_id FROM production_authority_lifecycle')[0].values[0][0];
    const persisted = readProductionAuthorityLifecycle(database, id);
    assert.equal(persisted.state, 'DURABLY_ESTABLISHED');
    assert.equal(persisted.cursorBlock, 110);
  } finally {
    fence.release();
    database.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('STEP 603 rejects non-VERIFIED context before persistence', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-lifecycle-'));
  const database = await createDatabase(':memory:');
  const fence = makeFence(dir);
  fence.acquire();
  try {
    assert.throws(
      () => establishProductionAuthorityLifecycle({
        database,
        writerFence: fence,
        processingContext: context({ status: 'PENDING' }),
        expectedAuthority: expected(),
      }),
      /PROCESSING_CONTEXT_NOT_VERIFIED/
    );
    assert.equal(database.db.exec('SELECT COUNT(*) FROM production_authority_lifecycle')[0].values[0][0], 0);
  } finally {
    fence.release();
    database.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('STEP 603 rejects generation mismatch and preserves cursor ownership boundary', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-lifecycle-'));
  const database = await createDatabase(':memory:');
  const fence = makeFence(dir);
  fence.acquire();
  try {
    assert.throws(
      () => establishProductionAuthorityLifecycle({
        database,
        writerFence: fence,
        processingContext: context(),
        expectedAuthority: expected({ generation: '2' }),
      }),
      /AUTHORITY_GENERATION_CONTEXT_MISMATCH/
    );
    assert.equal(database.db.exec('SELECT COUNT(*) FROM production_authority_lifecycle')[0].values[0][0], 0);
  } finally {
    fence.release();
    database.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('STEP 603 requires the existing writer fence', async () => {
  const database = await createDatabase(':memory:');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-lifecycle-'));
  const fence = makeFence(dir);
  try {
    assert.throws(
      () => establishProductionAuthorityLifecycle({
        database,
        writerFence: fence,
        processingContext: context(),
        expectedAuthority: expected(),
      }),
      /WRITER_FENCE_MISSING/
    );
  } finally {
    database.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('STEP 603 reorg creates a distinct immutable lifecycle record', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-lifecycle-'));
  const database = await createDatabase(':memory:');
  const fence = makeFence(dir);
  fence.acquire();
  try {
    const first = establishProductionAuthorityLifecycle({
      database,
      writerFence: fence,
      processingContext: context(),
      expectedAuthority: expected(),
    });
    const replacement = establishProductionAuthorityLifecycle({
      database,
      writerFence: fence,
      processingContext: context({
        fromBlock: 101,
        toBlock: 110,
        generation: '2',
        parentResultId: 'result-101-110',
        transitionType: 'REORG_REPLACEMENT',
        processingResultId: 'result-101-110-reorg',
        processingExecutionId: 'execution-101-110-reorg',
        lineageId: 'lineage-101-110-reorg',
        canonicalDecisionSnapshotId: 'snapshot-101-110-reorg',
      }),
      expectedAuthority: expected({ generation: '2' }),
    });

    const ids = database.db.exec('SELECT authority_lifecycle_id FROM production_authority_lifecycle ORDER BY authority_lifecycle_id')[0].values;
    assert.equal(ids.length, 2);
    assert.notEqual(ids[0][0], ids[1][0]);
    assert.equal(replacement.generation, '2');
    assert.ok(first);
    assert.throws(
      () => database.db.run('DELETE FROM production_authority_lifecycle'),
      /PRODUCTION_AUTHORITY_LIFECYCLE_APPEND_ONLY/
    );
  } finally {
    fence.release();
    database.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
