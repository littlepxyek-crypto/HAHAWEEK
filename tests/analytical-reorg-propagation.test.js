'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAnalyticalReorgPropagationPlan } = require('../src/core/analytical-reorg-propagation');

function fixture() {
  return {
    canonicality_change: 'REORG',
    invalidated_evidence_ids: ['e-orphaned'],
    projections: [
      { id: 'g1', layer: 'GRAPH', authority: 'DERIVED', evidence_ids: ['e-orphaned'], depends_on: [] },
      { id: 'f1', layer: 'FORMATION', authority: 'DERIVED', evidence_ids: ['e-other'], depends_on: ['g1'] },
      { id: 'h1', layer: 'HYPOTHESIS', authority: 'DERIVED', evidence_ids: ['e-other'], depends_on: ['f1'] },
      { id: 'v1', layer: 'VALIDATION', authority: 'DERIVED', evidence_ids: ['e-other'], depends_on: ['h1'] },
      { id: 'r1', layer: 'RESEARCH', authority: 'DERIVED', evidence_ids: ['e-other'], depends_on: ['v1'] },
      { id: 'rep1', layer: 'REPORT', authority: 'DERIVED', evidence_ids: ['e-other'], depends_on: ['r1'] },
    ],
  };
}

test('reorg directly invalidates affected graph and cascades through all downstream analytical layers', () => {
  const result = createAnalyticalReorgPropagationPlan(fixture());
  assert.equal(result.status, 'REBUILD_REQUIRED');
  assert.deepEqual(result.affected_by_layer, {
    GRAPH: ['g1'],
    FORMATION: ['f1'],
    HYPOTHESIS: ['h1'],
    VALIDATION: ['v1'],
    RESEARCH: ['r1'],
    REPORT: ['rep1'],
  });
  assert.equal(result.safety.canonical_evidence_mutated, false);
  assert.equal(result.safety.v4_authority_mutated, false);
  assert.equal(result.safety.stale_affected_projection_permitted, false);
});

test('unrelated projection remains unaffected', () => {
  const input = fixture();
  input.projections.push({
    id: 'f-unrelated',
    layer: 'FORMATION',
    authority: 'DERIVED',
    evidence_ids: ['e-unrelated'],
    depends_on: [],
  });
  const result = createAnalyticalReorgPropagationPlan(input);
  assert.deepEqual(result.affected_by_layer.FORMATION, ['f1']);
  assert.deepEqual(result.affected_by_layer.GRAPH, ['g1']);
});

test('direct evidence impact propagates even without an intermediate graph dependency', () => {
  const input = fixture();
  input.projections.push({
    id: 'v-direct',
    layer: 'VALIDATION',
    authority: 'DERIVED',
    evidence_ids: ['e-orphaned'],
    depends_on: [],
  });
  const result = createAnalyticalReorgPropagationPlan(input);
  assert.deepEqual(result.affected_by_layer.VALIDATION, ['v-direct', 'v1']);
});

test('invalid authority projection fails closed', () => {
  const input = fixture();
  input.projections[0].authority = 'CANONICAL';
  assert.throws(() => createAnalyticalReorgPropagationPlan(input), /PROJECTION_MUST_BE_DERIVED/);
});

test('non-reorg canonicality change fails closed', () => {
  const input = fixture();
  input.canonicality_change = 'CORRECTION';
  assert.throws(() => createAnalyticalReorgPropagationPlan(input), /CANONICALITY_CHANGE_MUST_BE_REORG/);
});

test('unknown dependency fails closed instead of silently preserving a stale descendant', () => {
  const input = fixture();
  input.projections[1].depends_on = ['missing-projection'];
  assert.throws(
    () => createAnalyticalReorgPropagationPlan(input),
    /UNKNOWN_PROJECTION_DEPENDENCY/
  );
});

test('missing dependency declaration does not silently create an inferred dependency', () => {
  const input = fixture();
  input.projections[1].depends_on = [];
  const result = createAnalyticalReorgPropagationPlan(input);
  assert.deepEqual(result.affected_by_layer.FORMATION, []);
  assert.deepEqual(result.affected_by_layer.HYPOTHESIS, []);
});

test('input is not mutated and output is deterministic', () => {
  const input = fixture();
  const before = JSON.stringify(input);
  const a = createAnalyticalReorgPropagationPlan(input);
  const b = createAnalyticalReorgPropagationPlan(input);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(a, b);
});
