'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  GRAPH_NODE_DOMAIN,
  GRAPH_EDGE_DOMAIN,
  graphNodeIdentity,
  graphEdgeIdentity,
} = require('../src/core/graph-identity');

test('graph node identity is deterministic and domain-separated', () => {
  const a = graphNodeIdentity('EVENT', 'e1', { chain_id: 4663 });
  const b = graphNodeIdentity('EVENT', 'e1', { chain_id: 4663 });

  assert.equal(a.identity, b.identity);
  assert.equal(a.domain, GRAPH_NODE_DOMAIN);
  assert.equal(a.algorithm, 'SHA-256');
  assert.notEqual(a.identity, 'e1');
  assert.notEqual(a.identity, '');  
});

test('graph node identity canonicalization is key-order independent', () => {
  const a = graphNodeIdentity('POOL', 'p1', { chain_id: 4663, scope: { b: 2, a: 1 } });
  const b = graphNodeIdentity('POOL', 'p1', { scope: { a: 1, b: 2 }, chain_id: 4663 });

  assert.equal(a.identity, b.identity);
});

test('graph edge identity is distinct from node identity', () => {
  const node = graphNodeIdentity('EVENT', 'e1');
  const edge = graphEdgeIdentity('EVENT:e1', 'REFERENCES', 'FORMATION:f1');

  assert.equal(edge.domain, GRAPH_EDGE_DOMAIN);
  assert.notEqual(node.identity, edge.identity);
  assert.notEqual(node.domain, edge.domain);
});

test('graph identity is not the V4 evidence identity API', () => {
  const node = graphNodeIdentity('EVENT', 'e1');
  assert.equal(node.domain, GRAPH_NODE_DOMAIN);
  assert.equal(node.canonical_object.graph_identity_kind, 'NODE');
  assert.equal(node.canonical_object.node_type, 'EVENT');
});
