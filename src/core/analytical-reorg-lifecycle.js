'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = 'ANALYTICAL_REORG_PROPAGATION_V1';
const STATES = Object.freeze(['INVALIDATED', 'REBUILT', 'FAILED']);

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(name.toUpperCase() + '_REQUIRED');
  }
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(name.toUpperCase() + '_REQUIRED');
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function digest(value) {
  return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

function lifecycleId(payload) {
  return 'arl:v1:' + crypto.createHash('sha256').update(stableJson(payload)).digest('hex');
}

function readLatest(database, projectionId) {
  const rows = database.db.exec(
    'SELECT event_sequence, lifecycle_event_id, reorg_id, projection_id, projection_layer, state, reason, invalidated_evidence_digest, projection_input_digest, rebuilt_projection_digest, contract_version, previous_event_sequence, committed_at ' +
    'FROM derived_projection_lifecycle WHERE projection_id = ? ORDER BY event_sequence DESC LIMIT 1',
    [projectionId]
  );
  if (!rows.length || !rows[0].values.length) return null;
  const row = rows[0].values[0];
  return {
    event_sequence: row[0],
    lifecycle_event_id: row[1],
    reorg_id: row[2],
    projection_id: row[3],
    projection_layer: row[4],
    state: row[5],
    reason: row[6],
    invalidated_evidence_digest: row[7],
    projection_input_digest: row[8],
    rebuilt_projection_digest: row[9],
    contract_version: row[10],
    previous_event_sequence: row[11],
    committed_at: row[12],
  };
}

function appendLifecycleEvent(database, event) {
  const previous = readLatest(database, event.projection_id);
  const previousSequence = previous ? previous.event_sequence : null;
  const idPayload = {
    contract_version: CONTRACT_VERSION,
    reorg_id: event.reorg_id,
    projection_id: event.projection_id,
    projection_layer: event.projection_layer,
    state: event.state,
    reason: event.reason,
    invalidated_evidence_digest: event.invalidated_evidence_digest,
    projection_input_digest: event.projection_input_digest,
    rebuilt_projection_digest: event.rebuilt_projection_digest ?? null,
    previous_event_sequence: previousSequence,
    committed_at: event.committed_at,
  };
  const lifecycleEventId = lifecycleId(idPayload);

  database.db.run(
    'INSERT INTO derived_projection_lifecycle (' +
    'lifecycle_event_id, reorg_id, projection_id, projection_layer, state, reason, ' +
    'invalidated_evidence_digest, projection_input_digest, rebuilt_projection_digest, ' +
    'contract_version, previous_event_sequence, committed_at' +
    ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      lifecycleEventId,
      event.reorg_id,
      event.projection_id,
      event.projection_layer,
      event.state,
      event.reason,
      event.invalidated_evidence_digest,
      event.projection_input_digest,
      event.rebuilt_projection_digest ?? null,
      CONTRACT_VERSION,
      previousSequence,
      event.committed_at,
    ]
  );

  return lifecycleEventId;
}

function validateProjection(projection) {
  requireObject(projection, 'projection');
  requireString(projection.id, 'projection_id');
  requireString(projection.layer, 'projection_layer');
}

async function rebuildProjection(database, projection, context, rebuild) {
  const rebuilt = await rebuild(projection, context);
  if (rebuilt === undefined || rebuilt === null) {
    throw new Error('REBUILD_RESULT_REQUIRED');
  }
  return rebuilt;
}

/**
 * Durable derived analytical reorg lifecycle.
 *
 * Canonical/V4 authority remains outside this module. This module records
 * append-only derived invalidation/rebuild state and invokes a caller-owned
 * deterministic rebuild function. A failed rebuild remains FAILED and never
 * becomes REBUILT.
 */
function createAnalyticalReorgLifecycle(database, clock = () => new Date().toISOString()) {
  requireObject(database, 'database');

  async function applyPlan(input, rebuild) {
    requireObject(input, 'input');
    requireObject(input.plan, 'plan');
    requireString(input.reorg_id, 'reorg_id');
    requireString(input.invalidated_evidence_digest, 'invalidated_evidence_digest');
    if (typeof rebuild !== 'function') throw new Error('REBUILD_FUNCTION_REQUIRED');
    if (input.plan.status !== 'REBUILD_REQUIRED') throw new Error('REBUILD_PLAN_REQUIRED');
    if (!Array.isArray(input.plan.affected_projections)) {
      throw new Error('AFFECTED_PROJECTIONS_REQUIRED');
    }

    const projections = new Map(
      input.plan.affected_projections.map((projection) => [projection.id, projection])
    );

    database.db.run('BEGIN');
    let committed = false;
    try {
      for (const projection of input.plan.affected_projections) {
        validateProjection(projection);
        if (projection.action !== 'INVALIDATE_AND_REBUILD') {
          throw new Error('INVALIDATION_ACTION_REQUIRED');
        }
        const projectionInputDigest = digest(projection);
        appendLifecycleEvent(database, {
          reorg_id: input.reorg_id,
          projection_id: projection.id,
          projection_layer: projection.layer,
          state: 'INVALIDATED',
          reason: projection.reason,
          invalidated_evidence_digest: input.invalidated_evidence_digest,
          projection_input_digest: projectionInputDigest,
          committed_at: clock(),
        });
      }
      database.db.run('COMMIT');
      committed = true;
    } finally {
      if (!committed) {
        try { database.db.run('ROLLBACK'); } catch {}
      }
    }

    const rebuilt = [];
    for (const projection of input.plan.affected_projections) {
      const context = {
        reorg_id: input.reorg_id,
        invalidated_evidence_digest: input.invalidated_evidence_digest,
        rebuilt_projection_ids: rebuilt.map((item) => item.projection_id),
        dependencies: projection.depends_on.filter((id) => projections.has(id)),
      };

      try {
        const value = await rebuildProjection(database, projection, context, rebuild);
        const rebuiltDigest = digest(value);
        const projectionInputDigest = digest(projection);
        database.db.run('BEGIN');
        let committedRebuild = false;
        try {
          appendLifecycleEvent(database, {
            reorg_id: input.reorg_id,
            projection_id: projection.id,
            projection_layer: projection.layer,
            state: 'REBUILT',
            reason: 'DETERMINISTIC_REBUILD_VERIFIED',
            invalidated_evidence_digest: input.invalidated_evidence_digest,
            projection_input_digest: projectionInputDigest,
            rebuilt_projection_digest: rebuiltDigest,
            committed_at: clock(),
          });
          database.db.run('COMMIT');
          committedRebuild = true;
        } finally {
          if (!committedRebuild) {
            try { database.db.run('ROLLBACK'); } catch {}
          }
        }
        rebuilt.push({
          projection_id: projection.id,
          layer: projection.layer,
          rebuilt_projection_digest: rebuiltDigest,
        });
      } catch (error) {
        database.db.run('BEGIN');
        let committedFailure = false;
        try {
          appendLifecycleEvent(database, {
            reorg_id: input.reorg_id,
            projection_id: projection.id,
            projection_layer: projection.layer,
            state: 'FAILED',
            reason: 'REBUILD_FAILED',
            invalidated_evidence_digest: input.invalidated_evidence_digest,
            projection_input_digest: digest(projection),
            committed_at: clock(),
          });
          database.db.run('COMMIT');
          committedFailure = true;
        } finally {
          if (!committedFailure) {
            try { database.db.run('ROLLBACK'); } catch {}
          }
        }
        return {
          status: 'REBUILD_FAILED',
          reorg_id: input.reorg_id,
          rebuilt,
          failed_projection_id: projection.id,
          error_code: error && error.message ? error.message : 'REBUILD_FAILED',
        };
      }
    }

    return {
      status: 'REBUILT',
      reorg_id: input.reorg_id,
      rebuilt,
      all_affected_projections_rebuilt: true,
    };
  }

  return {
    applyPlan,
    getLatest: (projectionId) => readLatest(database, projectionId),
  };
}

module.exports = {
  CONTRACT_VERSION,
  STATES,
  stableJson,
  digest,
  createAnalyticalReorgLifecycle,
};
