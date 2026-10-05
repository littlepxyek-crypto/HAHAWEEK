'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GRAPH_NODE_DOMAIN,
  GRAPH_EDGE_DOMAIN,
  graphNodeIdentity,
  graphEdgeIdentity,
} = require('../src/core/graph-identity');
const { rebuildEvidenceGraph } = require('../src/core/evidence-graph');

function evidence(id, blockNumber, blockHash, txHash) {
  return {
    evidence_id: id,
    evidence_type: 'RAW_LOG',
    chain_id: 4663,
    location: {
      block_number: blockNumber,
      block_hash: blockHash,
      transaction_hash: txHash,
      transaction_index: 0,
      log_index: 0,
    },
    contract_address: '0x' + 'd'.repeat(40),
    interpretation_status: 'UNINTERPRETED',
    raw_reference: { event_id: id },
    provenance_reference: { raw_event_id: id },
  };
}

test('node and edge identities are domain separated', () => {
  const node = graphNodeIdentity('EVENT', 'e1');
  const edge = graphEdgeIdentity('EVENT:e1', 'REFERENCES', 'FORMATION:f1');

  assert.equal(node.domain, GRAPH_NODE_DOMAIN);
  assert.equal(edge.domain, GRAPH_EDGE_DOMAIN);
  assert.notEqual(node.identity, edge.identity);
});

test('identity canonicalization rejects invalid required identifiers', () => {
  assert.throws(() => graphNodeIdentity('', 'e1'), /NODE_TYPE_REQUIRED/);
  assert.throws(() => graphNodeIdentity('EVENT', ''), /NODE_ID_REQUIRED/);
  assert.throws(() => graphEdgeIdentity('', 'REFERENCES', 'FORMATION:f1'), /FROM_REQUIRED/);
  assert.throws(() => graphEdgeIdentity('EVENT:e1', '', 'FORMATION:f1'), /EDGE_TYPE_REQUIRED/);
  assert.throws(() => graphEdgeIdentity('EVENT:e1', 'REFERENCES', ''), /TO_REQUIRED/);
});

test('graph identity scope is deterministic and recursively key-order independent', () => {
  const a = graphNodeIdentity('EVENT', 'e1', {
    chain_id: 4663,
    nested: { z: 3, a: 1 },
  });
  const b = graphNodeIdentity('EVENT', 'e1', {
    nested: { a: 1, z: 3 },
    chain_id: 4663,
  });

  assert.equal(a.identity, b.identity);
});

test('graph rebuild is deterministic and independent of projection order', () => {
  const a = evidence('ei:v1:' + 'a'.repeat(64), 100, '0x' + 'b'.repeat(64), '0x' + 'c'.repeat(64));
  const b = evidence('ei:v1:' + 'e'.repeat(64), 101, '0x' + 'f'.repeat(64), '0x' + '1'.repeat(64));
  const formation = {
    formation_id: 'formation:pb:1',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    formation_start: 100,
    formation_end: 101,
    state: 'VALID',
    evidence_ids: [a.evidence_id, b.evidence_id],
  };

  const first = rebuildEvidenceGraph({
    evidence: [a, b],
    formations: [formation],
  });
  const second = rebuildEvidenceGraph({
    evidence: [b, a],
    formations: [formation],
  });

  assert.deepEqual(first, second);
  assert.equal(first.nodes.filter((node) => node.type === 'FORMATION').length, 1);
});

test('rebuild does not mutate authoritative inputs', () => {
  const source = evidence('ei:v1:' + 'a'.repeat(64), 100, '0x' + 'b'.repeat(64), '0x' + 'c'.repeat(64));
  const before = JSON.stringify(source);

  rebuildEvidenceGraph({ evidence: [source], formations: [] });

  assert.equal(JSON.stringify(source), before);
});

test('rebuild fails closed for invalid input collections', () => {
  assert.throws(() => rebuildEvidenceGraph({ evidence: {} }), /EVIDENCE_ARRAY_REQUIRED/);
  assert.throws(() => rebuildEvidenceGraph({ formations: {} }), /FORMATIONS_ARRAY_REQUIRED/);
});
