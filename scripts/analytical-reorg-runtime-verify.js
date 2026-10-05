'use strict';

const fs = require('node:fs');
const path = require('node:path');

const fixture = require('../docs/golden-vectors/f02-reorg-scenario.json');
const { validateScenario } = require('../src/v4/f02-reorg-verifier');
const { createDatabase } = require('../src/core/database');
const { createAnalyticalReorgPropagationPlan } = require('../src/core/analytical-reorg-propagation');
const { createAnalyticalReorgLifecycle } = require('../src/core/analytical-reorg-lifecycle');

const COMMIT = process.env.GITHUB_SHA || 'local';
const ARTIFACT = path.join(process.cwd(), 'docs/runtime/analytical-reorg-runtime-latest.json');

function projectionSet() {
  return [
    { id: 'graph:f02', layer: 'GRAPH', authority: 'DERIVED', evidence_ids: ['evidence-orphaned'], depends_on: [] },
    { id: 'formation:f02', layer: 'FORMATION', authority: 'DERIVED', evidence_ids: [], depends_on: ['graph:f02'] },
    { id: 'hypothesis:f02', layer: 'HYPOTHESIS', authority: 'DERIVED', evidence_ids: [], depends_on: ['formation:f02'] },
    { id: 'validation:f02', layer: 'VALIDATION', authority: 'DERIVED', evidence_ids: [], depends_on: ['hypothesis:f02'] },
    { id: 'research:f02', layer: 'RESEARCH', authority: 'DERIVED', evidence_ids: [], depends_on: ['validation:f02'] },
    { id: 'report:f02', layer: 'REPORT', authority: 'DERIVED', evidence_ids: [], depends_on: ['research:f02'] },
  ];
}

async function runLifecycle() {
  const database = await createDatabase(':memory:');
  const before = {
    canonical_evidence: database.db.exec('SELECT COUNT(*) FROM canonical_evidence')[0].values[0][0],
    canonical_transitions: database.db.exec('SELECT COUNT(*) FROM canonical_transitions')[0].values[0][0],
  };
  const f02 = validateScenario(structuredClone(fixture));
  if (f02.status !== 'VERIFIED') throw new Error('F02_FIXTURE_NOT_VERIFIED');

  const plan = createAnalyticalReorgPropagationPlan({
    canonicality_change: 'REORG',
    invalidated_evidence_ids: ['evidence-orphaned'],
    projections: projectionSet(),
  });

  const lifecycle = createAnalyticalReorgLifecycle(database, () => '2026-10-06T00:00:00.000Z');
  const result = await lifecycle.applyPlan({
    reorg_id: 'reorg-runtime-f02',
    invalidated_evidence_digest: 'f02-runtime-evidence-digest',
    plan,
  }, async (projection, context) => ({
    projection_id: projection.id,
    layer: projection.layer,
    source: 'canonical-evidence',
    reorg_id: context.reorg_id,
    dependencies: context.rebuilt_projection_ids,
  }));

  if (result.status !== 'REBUILT' || !result.all_affected_projections_rebuilt) throw new Error('REORG_RUNTIME_REBUILD_FAILED');

  const latest = projectionSet().map(p => lifecycle.getLatest(p.id));
  if (latest.some(event => !event || event.state !== 'REBUILT')) throw new Error('REORG_RUNTIME_STALE_PROJECTION');

  const history = database.db.exec('SELECT state FROM derived_projection_lifecycle ORDER BY event_sequence')[0].values.map(row => row[0]);
  const after = {
    canonical_evidence: database.db.exec('SELECT COUNT(*) FROM canonical_evidence')[0].values[0][0],
    canonical_transitions: database.db.exec('SELECT COUNT(*) FROM canonical_transitions')[0].values[0][0],
  };
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('REORG_RUNTIME_MUTATED_V4_EVIDENCE');

  database.close();
  return { f02, plan, result, latest, history, before, after };
}

async function runFailurePath() {
  const database = await createDatabase(':memory:');
  const lifecycle = createAnalyticalReorgLifecycle(database, () => '2026-10-06T00:01:00.000Z');
  const plan = createAnalyticalReorgPropagationPlan({
    canonicality_change: 'REORG',
    invalidated_evidence_ids: ['evidence-orphaned'],
    projections: projectionSet(),
  });

  const result = await lifecycle.applyPlan({
    reorg_id: 'reorg-runtime-f02-failure',
    invalidated_evidence_digest: 'f02-runtime-evidence-digest',
    plan,
  }, async projection => {
    if (projection.id === 'validation:f02') throw new Error('REBUILD_SOURCE_UNAVAILABLE');
    return { projection_id: projection.id };
  });

  const failed = lifecycle.getLatest('validation:f02');
  database.close();

  if (result.status !== 'REBUILD_FAILED' || failed.state !== 'FAILED') throw new Error('REORG_RUNTIME_FAILURE_NOT_FAIL_CLOSED');
  return { result, failed };
}

(async () => {
  const startedAt = new Date().toISOString();
  try {
    const success = await runLifecycle();
    const failure = await runFailurePath();
    const artifact = {
      verification_class: 'E5_RUNTIME_REORG_DERIVED',
      contract_id: 'ANALYTICAL_REORG_PROPAGATION_V1',
      commit: COMMIT,
      state: 'VERIFIED',
      mode: 'CONTROLLED_DERIVED_RUNTIME',
      live_rpc_reorg: false,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      f02_status: success.f02.status,
      propagation_status: success.plan.status,
      lifecycle_status: success.result.status,
      affected_projection_count: success.plan.affected_projections.length,
      history: success.history,
      v4_mutation_check: success.before,
      failure_path: {
        status: failure.result.status,
        failed_projection_id: failure.result.failed_projection_id,
        latest_state: failure.failed.state,
      },
      safety: {
        canonical_evidence_mutated: false,
        canonical_transitions_mutated: false,
        stale_affected_projection_permitted: false,
        authority_activation: 'INACTIVE',
      },
    };
    fs.mkdirSync(path.dirname(ARTIFACT), { recursive: true });
    fs.writeFileSync(ARTIFACT, JSON.stringify(artifact, null, 2) + '\n');
    console.log(JSON.stringify(artifact, null, 2));
  } catch (error) {
    const artifact = {
      verification_class: 'E5_RUNTIME_REORG_DERIVED',
      contract_id: 'ANALYTICAL_REORG_PROPAGATION_V1',
      commit: COMMIT,
      state: 'FAILED',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      error: error && error.message ? error.message : String(error),
    };
    fs.mkdirSync(path.dirname(ARTIFACT), { recursive: true });
    fs.writeFileSync(ARTIFACT, JSON.stringify(artifact, null, 2) + '\n');
    console.error(JSON.stringify(artifact, null, 2));
    process.exitCode = 1;
  }
})();
