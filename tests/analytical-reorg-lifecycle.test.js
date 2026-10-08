'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createDatabase, SCHEMA_VERSION } = require('../src/core/database');
const {
  CONTRACT_VERSION,
  createAnalyticalReorgLifecycle,
  digest,
} = require('../src/core/analytical-reorg-lifecycle');

function plan() {
  return {
    status: 'REBUILD_REQUIRED',
    affected_projections: [
      {
        id: 'g1',
        layer: 'GRAPH',
        action: 'INVALIDATE_AND_REBUILD',
        reason: 'DIRECT_CANONICAL_EVIDENCE_CHANGE',
        depends_on: [],
      },
      {
        id: 'f1',
        layer: 'FORMATION',
        action: 'INVALIDATE_AND_REBUILD',
        reason: 'DOWNSTREAM_DEPENDENCY_INVALIDATED',
        depends_on: [],
      },
    ],
  };
}

async function withDatabase(fn) {
  const database = await createDatabase(':memory:');
  try {
    return await fn(database);
  } finally {
    database.close();
  }
}

test('schema 9 creates append-only derived projection lifecycle storage', async () => {
  await withDatabase(async (database) => {
    assert.equal(SCHEMA_VERSION, 9);
    const rows = database.db.exec(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'derived_projection_lifecycle'"
    );
    assert.equal(rows[0].values.length, 1);
  });
});

test('reorg lifecycle durably records parallel graph and formation invalidation then deterministic rebuild', async () => {
  await withDatabase(async (database) => {
    let tick = 0;
    const lifecycle = createAnalyticalReorgLifecycle(
      database,
      () => '2026-10-03T00:00:0' + (++tick) + '.000Z'
    );

    const result = await lifecycle.applyPlan({
      reorg_id: 'reorg-1',
      invalidated_evidence_digest: 'evidence-digest-1',
      plan: plan(),
    }, async (projection, context) => ({
      projection_id: projection.id,
      source: 'canonical-evidence-rebuild',
      dependencies: context.rebuilt_projection_ids,
    }));

    assert.equal(result.status, 'REBUILT');
    assert.equal(result.all_affected_projections_rebuilt, true);
    assert.equal(result.rebuilt.length, 2);
    assert.deepEqual(result.rebuilt.map((item) => item.projection_id), ['g1', 'f1']);
    assert.equal(result.rebuilt[0].rebuilt_projection_digest, digest({
      projection_id: 'g1',
      source: 'canonical-evidence-rebuild',
      dependencies: [],
    }));

    const latestGraph = lifecycle.getLatest('g1');
    const latestFormation = lifecycle.getLatest('f1');
    assert.equal(latestGraph.state, 'REBUILT');
    assert.equal(latestFormation.state, 'REBUILT');
    assert.equal(latestGraph.contract_version, CONTRACT_VERSION);
    assert.equal(latestGraph.previous_event_sequence, 1);
    assert.equal(latestFormation.previous_event_sequence, 2);

    const history = database.db.exec(
      "SELECT state FROM derived_projection_lifecycle ORDER BY event_sequence"
    );
    assert.deepEqual(history[0].values.map((row) => row[0]), [
      'INVALIDATED', 'INVALIDATED', 'REBUILT', 'REBUILT'
    ]);
  });
});

test('failed rebuild remains FAILED and cannot become silently valid', async () => {
  await withDatabase(async (database) => {
    const lifecycle = createAnalyticalReorgLifecycle(database, () => '2026-10-03T00:01:00.000Z');

    const result = await lifecycle.applyPlan({
      reorg_id: 'reorg-fail',
      invalidated_evidence_digest: 'evidence-digest-fail',
      plan: plan(),
    }, async (projection) => {
      if (projection.id === 'f1') throw new Error('REBUILD_SOURCE_UNAVAILABLE');
      return { projection_id: projection.id };
    });

    assert.equal(result.status, 'REBUILD_FAILED');
    assert.equal(result.failed_projection_id, 'f1');
    assert.equal(lifecycle.getLatest('g1').state, 'REBUILT');
    assert.equal(lifecycle.getLatest('f1').state, 'FAILED');
  });
});

test('rejects unknown dependencies fail closed before invalidation', async () => {
  await withDatabase(async (database) => {
    const lifecycle = createAnalyticalReorgLifecycle(database);
    const invalidPlan = plan();
    invalidPlan.affected_projections[1].depends_on = ['missing-projection'];
    await assert.rejects(
      lifecycle.applyPlan({
        reorg_id: 'reorg-unknown-dependency',
        invalidated_evidence_digest: 'evidence-digest',
        plan: invalidPlan,
      }, async () => ({ rebuilt: true })),
      /UNKNOWN_DEPENDENCY:missing-projection/
    );
    const rows = database.db.exec('SELECT COUNT(*) FROM derived_projection_lifecycle');
    assert.equal(rows[0].values[0][0], 0);
  });
});

test('append-only lifecycle rejects UPDATE and DELETE', async () => {
  await withDatabase(async (database) => {
    const lifecycle = createAnalyticalReorgLifecycle(database, () => '2026-10-03T00:02:00.000Z');
    await lifecycle.applyPlan({
      reorg_id: 'reorg-append-only',
      invalidated_evidence_digest: 'evidence-digest',
      plan: {
        status: 'REBUILD_REQUIRED',
        affected_projections: [plan().affected_projections[0]],
      },
    }, async () => ({ rebuilt: true }));

    assert.throws(
      () => database.db.run("UPDATE derived_projection_lifecycle SET reason = 'tampered' WHERE event_sequence = 1"),
      /DERIVED_PROJECTION_LIFECYCLE_APPEND_ONLY/
    );
    assert.throws(
      () => database.db.run("DELETE FROM derived_projection_lifecycle WHERE event_sequence = 1"),
      /DERIVED_PROJECTION_LIFECYCLE_APPEND_ONLY/
    );
  });
});

test('invalid plan and missing rebuild function fail closed', async () => {
  await withDatabase(async (database) => {
    const lifecycle = createAnalyticalReorgLifecycle(database);
    await assert.rejects(
      lifecycle.applyPlan({ reorg_id: 'x', invalidated_evidence_digest: 'd', plan: { status: 'INVALID' } }, () => ({})),
      /REBUILD_PLAN_REQUIRED/
    );
    await assert.rejects(
      lifecycle.applyPlan({ reorg_id: 'x', invalidated_evidence_digest: 'd', plan: plan() }),
      /REBUILD_FUNCTION_REQUIRED/
    );
  });
});

test('schema 8 databases migrate to schema 9 and preserve authoritative tables', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-reorg-migration-'));
  const filename = path.join(dir, 'test.sqlite');
  const first = await createDatabase(filename);
  first.db.run('DROP TABLE derived_projection_lifecycle');
  first.db.run("UPDATE schema_meta SET value = '8' WHERE key = 'schema_version'");
  first.save();
  first.close();

  const reopened = await createDatabase(filename);
  assert.equal(reopened.db.exec("SELECT value FROM schema_meta WHERE key = 'schema_version'")[0].values[0][0], '9');
  assert.equal(
    reopened.db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'derived_projection_lifecycle'")[0].values.length,
    1
  );
  assert.equal(
    reopened.db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'canonical_evidence'")[0].values.length,
    1
  );
  reopened.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
