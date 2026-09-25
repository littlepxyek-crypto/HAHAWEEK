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

function fence(dir) {
  return createWriterFence({
    filename: path.join(dir, 'writer-fence-state.json'),
    ownerId: 'test-owner',
    now: () => 1000,
    leaseMs: 30000,
  });
}

async function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-reconcile-'));
  const database = await createDatabase(':memory:');
  const writerFence = fence(dir);
  writerFence.acquire();
  establishProductionAuthorityLifecycle({
    database,
    writerFence,
    processingContext: context(),
    expectedAuthority: expected(),
  });
  return {
    dir,
    database,
    writerFence,
  };
}

function cleanup(state) {
  state.writerFence.release();
  state.database.close();
  fs.rmSync(state.dir, { recursive: true, force: true });
}

test('STEP 606 reconciles a durable lifecycle ahead of the cursor by exact forward completion', async () => {
  const state = await setup();
  try {
    let cursor = 100;
    const result = reconcileProductionAuthorityLifecycleCursor({
      database: state.database,
      cursor: {
        get: () => cursor,
        advance: block => { cursor = block; },
      },
      expectedAuthorityFactory: () => expected(),
    });

    assert.deepEqual(result, { reconciled: 1, cursor: 110 });
    assert.equal(cursor, 110);
  } finally {
    cleanup(state);
  }
});

test('STEP 606 fails closed on a lifecycle range gap', async () => {
  const state = await setup();
  try {
    let cursor = 99;
    assert.throws(
      () => reconcileProductionAuthorityLifecycleCursor({
        database: state.database,
        cursor: { get: () => cursor, advance: block => { cursor = block; } },
        expectedAuthorityFactory: () => expected(),
      }),
      /LIFECYCLE_RECONCILIATION_RANGE_GAP/
    );
    assert.equal(cursor, 99);
  } finally {
    cleanup(state);
  }
});

test('STEP 606 fails closed when durable lifecycle authority differs from expected authority', async () => {
  const state = await setup();
  try {
    let cursor = 100;
    assert.throws(
      () => reconcileProductionAuthorityLifecycleCursor({
        database: state.database,
        cursor: { get: () => cursor, advance: block => { cursor = block; } },
        expectedAuthorityFactory: () => expected({ manifestDigest: 'c'.repeat(64) }),
      }),
      /LIFECYCLE_RECONCILIATION_EXPECTED_MISMATCH_MANIFESTDIGEST/
    );
    assert.equal(cursor, 100);
  } finally {
    cleanup(state);
  }
});

test('STEP 606 preserves durable lifecycle when cursor persistence fails', async () => {
  const state = await setup();
  try {
    let cursor = 100;
    assert.throws(
      () => reconcileProductionAuthorityLifecycleCursor({
        database: state.database,
        cursor: { get: () => cursor, advance: () => { throw new Error('CURSOR_WRITE_FAILED'); } },
        expectedAuthorityFactory: () => expected(),
      }),
      /LIFECYCLE_RECONCILIATION_CURSOR_ADVANCE_FAILED/
    );
    assert.equal(cursor, 100);
    const rows = state.database.db.exec('SELECT COUNT(*) FROM production_authority_lifecycle')[0].values[0][0];
    assert.equal(rows, 1);
  } finally {
    cleanup(state);
  }
});
