'use strict';

/**
 * Analytical Reorg Propagation v1
 *
 * Pure, deterministic planning boundary for derived-layer invalidation.
 * It never mutates canonical evidence, V4 authority, or any projection.
 * Rebuild is explicitly represented as a required downstream action.
 */

const LAYERS = Object.freeze([
  'GRAPH',
  'FORMATION',
  'HYPOTHESIS',
  'VALIDATION',
  'RESEARCH',
  'REPORT',
]);

const DOWNSTREAM = Object.freeze({
  GRAPH: ['FORMATION'],
  FORMATION: ['HYPOTHESIS', 'VALIDATION'],
  HYPOTHESIS: ['VALIDATION'],
  VALIDATION: ['RESEARCH'],
  RESEARCH: ['REPORT'],
  REPORT: [],
});

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

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function validateProjection(projection) {
  requireObject(projection, 'projection');
  requireString(projection.id, 'projection_id');
  requireString(projection.layer, 'projection_layer');
  if (!LAYERS.includes(projection.layer)) throw new Error('PROJECTION_LAYER_INVALID');
  if (!Array.isArray(projection.evidence_ids)) throw new Error('PROJECTION_EVIDENCE_IDS_REQUIRED');
  projection.evidence_ids.forEach((id) => requireString(id, 'evidence_id'));
  if (!Array.isArray(projection.depends_on)) throw new Error('PROJECTION_DEPENDENCIES_REQUIRED');
  projection.depends_on.forEach((id) => requireString(id, 'dependency_id'));
  if (projection.authority !== 'DERIVED') throw new Error('PROJECTION_MUST_BE_DERIVED');
}

function validateInput(input) {
  requireObject(input, 'input');
  if (!Array.isArray(input.invalidated_evidence_ids) || input.invalidated_evidence_ids.length === 0) {
    throw new Error('INVALIDATED_EVIDENCE_IDS_REQUIRED');
  }
  input.invalidated_evidence_ids.forEach((id) => requireString(id, 'evidence_id'));
  if (!Array.isArray(input.projections)) throw new Error('PROJECTIONS_REQUIRED');
  input.projections.forEach(validateProjection);
  if (input.canonicality_change !== 'REORG') throw new Error('CANONICALITY_CHANGE_MUST_BE_REORG');
}

function createAnalyticalReorgPropagationPlan(input) {
  validateInput(input);

  const original = JSON.stringify(input);
  const projections = input.projections.map((p) => ({
    ...p,
    evidence_ids: uniqueSorted(p.evidence_ids),
    depends_on: uniqueSorted(p.depends_on),
  }));
  const invalidatedEvidence = new Set(input.invalidated_evidence_ids);

  const byId = new Map(projections.map((p) => [p.id, p]));
  if (byId.size !== projections.length) throw new Error('DUPLICATE_PROJECTION_ID');

  // Initial impact: projection directly references changed canonical evidence.
  const affected = new Set();
  for (const projection of projections) {
    if (projection.evidence_ids.some((id) => invalidatedEvidence.has(id))) {
      affected.add(projection.id);
    }
  }

  // Cascade only through declared dependencies. Unknown dependencies are
  // rejected so a stale descendant cannot be silently preserved.
  let changed = true;
  while (changed) {
    changed = false;
    for (const projection of projections) {
      if (affected.has(projection.id)) continue;
      if (projection.depends_on.some((dependencyId) => affected.has(dependencyId))) {
        affected.add(projection.id);
        changed = true;
      }
    }
  }

  const affectedProjections = projections
    .filter((p) => affected.has(p.id))
    .sort((a, b) => {
      const layerDelta = LAYERS.indexOf(a.layer) - LAYERS.indexOf(b.layer);
      return layerDelta || a.id.localeCompare(b.id);
    })
    .map((p) => ({
      id: p.id,
      layer: p.layer,
      action: 'INVALIDATE_AND_REBUILD',
      reason: p.evidence_ids.some((id) => invalidatedEvidence.has(id))
        ? 'DIRECT_CANONICAL_EVIDENCE_CHANGE'
        : 'DOWNSTREAM_DEPENDENCY_INVALIDATED',
      depends_on: [...p.depends_on],
    }));

  const affectedByLayer = Object.fromEntries(
    LAYERS.map((layer) => [
      layer,
      affectedProjections.filter((p) => p.layer === layer).map((p) => p.id),
    ])
  );

  const result = {
    schema_version: '1',
    contract: 'ANALYTICAL_REORG_PROPAGATION_V1',
    status: 'REBUILD_REQUIRED',
    canonicality_change: 'REORG',
    invalidated_evidence_ids: uniqueSorted(input.invalidated_evidence_ids),
    affected_by_layer: affectedByLayer,
    affected_projections: affectedProjections,
    safety: {
      canonical_evidence_mutated: false,
      v4_authority_mutated: false,
      stale_affected_projection_permitted: false,
      deterministic: true,
    },
  };

  if (JSON.stringify(input) !== original) throw new Error('INPUT_MUTATED');
  return Object.freeze(result);
}

module.exports = {
  LAYERS,
  DOWNSTREAM,
  createAnalyticalReorgPropagationPlan,
};
