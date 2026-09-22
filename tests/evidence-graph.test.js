'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createEvidenceGraph } = require('../src/core/evidence-graph');

function evidence(overrides = {}) {
  return {
    evidence_id: 'ei:v1:' + 'a'.repeat(64),
    evidence_type: 'RAW_LOG',
    chain_id: 4663,
    location: {
      block_number: 100,
      block_hash: '0x' + 'b'.repeat(64),
      transaction_hash: '0x' + 'c'.repeat(64),
      transaction_index: 2,
      log_index: 4,
    },
    contract_address: '0x' + 'd'.repeat(40),
    interpretation_status: 'UNINTERPRETED',
    raw_reference: { event_id: '4663:100:0x' + 'c'.repeat(64) + ':4' },
    provenance_reference: { raw_event_id: '4663:100:0x' + 'c'.repeat(64) + ':4' },
    ...overrides,
  };
}

test('projects canonical evidence into deterministic block, transaction, contract, and event nodes', () => {
  const graph = createEvidenceGraph();

  graph.projectEvidence(evidence());

  const result = graph.toJSON();
  assert.equal(result.version, '0.1');
  assert.equal(result.nodes.length, 4);
  assert.equal(result.edges.length, 4);
  assert.deepEqual(
    result.nodes.map(node => node.type),
    ['BLOCK', 'CONTRACT', 'EVENT', 'TRANSACTION']
  );
});

test('projection is idempotent for identical evidence', () => {
  const graph = createEvidenceGraph();
  const source = evidence();

  graph.projectEvidence(source);
  graph.projectEvidence(source);

  assert.deepEqual(graph.count(), { nodes: 4, edges: 4 });
});

test('conflicting projection for the same node is rejected', () => {
  const graph = createEvidenceGraph();
  const source = evidence();

  graph.projectEvidence(source);

  const conflict = evidence({
    location: {
      ...source.location,
      block_number: 101,
    },
  });

  assert.throws(
    () => graph.projectEvidence(conflict),
    /GRAPH_NODE_CONFLICT/
  );
});

test('formation references only already projected evidence', () => {
  const graph = createEvidenceGraph();
  const source = evidence();

  graph.projectEvidence(source);

  graph.projectFormation({
    formation_id: 'formation:pb:1',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: '0.1',
    chain_id: 4663,
    formation_start: 100,
    formation_end: 100,
    state: 'CANDIDATE',
    evidence_ids: [source.evidence_id],
  });

  const result = graph.toJSON();
  assert.equal(result.nodes.filter(node => node.type === 'FORMATION').length, 1);
  assert.equal(
    result.edges.some(edge =>
      edge.type === 'REFERENCES' &&
      edge.from === 'FORMATION:formation:pb:1' &&
      edge.to === `EVENT:${source.evidence_id}`
    ),
    true
  );
});

test('formation cannot reference evidence absent from the graph', () => {
  const graph = createEvidenceGraph();

  assert.throws(
    () => graph.projectFormation({
      formation_id: 'formation:pb:missing',
      evidence_ids: [evidence().evidence_id],
    }),
    /FORMATION_EVIDENCE_NOT_PROJECTED/
  );
});

test('projection does not mutate canonical evidence', () => {
  const graph = createEvidenceGraph();
  const source = evidence();
  const before = JSON.stringify(source);

  graph.projectEvidence(source);

  assert.equal(JSON.stringify(source), before);
});

test('graph output is deterministic regardless of projection order', () => {
  const first = createEvidenceGraph();
  const second = createEvidenceGraph();

  const a = evidence({
    evidence_id: 'ei:v1:' + 'a'.repeat(64),
    location: {
      block_number: 100,
      block_hash: '0x' + 'b'.repeat(64),
      transaction_hash: '0x' + 'c'.repeat(64),
      transaction_index: 2,
      log_index: 4,
    },
  });
  const b = evidence({
    evidence_id: 'ei:v1:' + 'e'.repeat(64),
    location: {
      block_number: 101,
      block_hash: '0x' + 'f'.repeat(64),
      transaction_hash: '0x' + '1'.repeat(64),
      transaction_index: 1,
      log_index: 2,
    },
  });

  first.projectEvidence(a);
  first.projectEvidence(b);
  second.projectEvidence(b);
  second.projectEvidence(a);

  assert.deepEqual(first.toJSON(), second.toJSON());
});
