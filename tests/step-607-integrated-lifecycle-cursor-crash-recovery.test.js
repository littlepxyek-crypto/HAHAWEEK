'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createDatabase } = require('../src/core/database');
const { createWriterFence } = require('../src/core/single-writer-fence');
const { establishProductionAuthorityLifecycle } = require('../src/core/production-authority-lifecycle');
const { reconcileProductionAuthorityLifecycleCursor } = require('../src/core/production-authority-lifecycle-reconciliation');
const { BlockCursor } = require('../src/core/block-cursor');

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

function createFence(dir, ownerId) {
  return createWriterFence({
    filename: path.join(dir, ownerId + '-writer-fence.json'),
    ownerId,
    now: () => 1000,
    leaseMs: 30000,
  });
}

function readPersistedCursor(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8')).lastProcessedBlock;
}

function writePersistedCursor(file, block) {
  fs.writeFileSync(
    file,
    JSON.stringify({
      version: 1,
      lastProcessedBlock: block,
      status: 'READY',
      lastError: null,
      updatedAt: null,
    }, null, 2) + '\n'
  );
}

test('STEP 607 recovers lifecycle durable before cursor after restart without rewriting evidence', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-step-607-'));
  const dbFile = path.join(dir, 'hahaweek.sqlite');
  const stateFile = path.join(dir, 'state.json');
  writePersistedCursor(stateFile, 100);

  let database;
  let writerFence;

  try {
    database = await createDatabase(dbFile);
    writerFence = createFence(dir, 'step-607-writer-1');
    writerFence.acquire();

    const preparedAuthority = expected();
    establishProductionAuthorityLifecycle({
      database,
      writerFence,
      processingContext: context(),
      expectedAuthority: preparedAuthority,
    });

    const lifecycleRowsBeforeCrash = database.db.exec(
      'SELECT authority_lifecycle_id, state, from_block, to_block FROM production_authority_lifecycle ORDER BY authority_lifecycle_id'
    )[0].values;

    assert.equal(lifecycleRowsBeforeCrash.length, 1);
    assert.equal(lifecycleRowsBeforeCrash[0][1], 'DURABLY_ESTABLISHED');
    assert.deepEqual(
      lifecycleRowsBeforeCrash[0].slice(2),
      [101, 110]
    );

    database.close();
    database = null;
    writerFence.release();
    writerFence = null;

    // Crash boundary: lifecycle is durable, cursor has not advanced.
    assert.equal(readPersistedCursor(stateFile), 100);

    const restartedDatabase = await createDatabase(dbFile);
    const restartedFence = createFence(dir, 'step-607-writer-2');
    restartedFence.acquire();

    try {
      const cursor = new BlockCursor({
        loadState: () => JSON.parse(fs.readFileSync(stateFile, 'utf8')),
        saveState: nextState => {
          fs.writeFileSync(
            stateFile,
            JSON.stringify(nextState, null, 2) + '\n'
          );
        },
      });

      assert.equal(cursor.get(), 100);

      const result = reconcileProductionAuthorityLifecycleCursor({
        database: restartedDatabase,
        cursor,
        expectedAuthorityFactory: () => preparedAuthority,
      });

      assert.deepEqual(result, { reconciled: 1, cursor: 110 });
      assert.equal(readPersistedCursor(stateFile), 110);

      const lifecycleRowsAfterRecovery = restartedDatabase.db.exec(
        'SELECT authority_lifecycle_id, state, from_block, to_block FROM production_authority_lifecycle ORDER BY authority_lifecycle_id'
      )[0].values;

      assert.deepEqual(lifecycleRowsAfterRecovery, lifecycleRowsBeforeCrash);
      assert.equal(lifecycleRowsAfterRecovery.length, 1);
    } finally {
      restartedFence.release();
      restartedDatabase.close();
    }
  } finally {
    if (writerFence) {
      try { writerFence.release(); } catch {}
    }
    if (database) {
      try { database.close(); } catch {}
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('STEP 607 fails closed when cursor persistence fails after durable lifecycle and preserves restart evidence', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-step-607-fail-'));
  const dbFile = path.join(dir, 'hahaweek.sqlite');
  const stateFile = path.join(dir, 'state.json');
  writePersistedCursor(stateFile, 100);

  const database = await createDatabase(dbFile);
  const writerFence = createFence(dir, 'step-607-writer');
  writerFence.acquire();

  try {
    const authority = expected();

    establishProductionAuthorityLifecycle({
      database,
      writerFence,
      processingContext: context(),
      expectedAuthority: authority,
    });

    const cursor = new BlockCursor({
      loadState: () => JSON.parse(fs.readFileSync(stateFile, 'utf8')),
      saveState: () => {
        throw new Error('SIMULATED_CURSOR_PERSISTENCE_FAILURE');
      },
    });

    assert.throws(
      () => reconcileProductionAuthorityLifecycleCursor({
        database,
        cursor,
        expectedAuthorityFactory: () => authority,
      }),
      /LIFECYCLE_RECONCILIATION_CURSOR_ADVANCE_FAILED/
    );

    assert.equal(cursor.get(), 100);
    assert.equal(readPersistedCursor(stateFile), 100);

    const rows = database.db.exec(
      'SELECT COUNT(*) FROM production_authority_lifecycle'
    )[0].values[0][0];

    assert.equal(rows, 1);
  } finally {
    writerFence.release();
    database.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
