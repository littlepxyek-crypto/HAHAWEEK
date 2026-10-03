'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

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
        depends_on: ['g1'],
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

test('reorg lifecycle durably records invalidation then deterministic rebuild', async () => {
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
    assert.equal(latestFormation.previous_event_sequence > latestGraph.event_sequence, true);

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
