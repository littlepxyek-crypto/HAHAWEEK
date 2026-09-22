'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createEvidenceGraph } = require('../src/core/evidence-graph');
const { detectPoolBootstrap } = require('../src/core/pool-bootstrap-formation');

function canonicalEvidence(id, block, tx, log) {
  return {
    evidence_id: id,
    evidence_type: 'RAW_LOG',
    chain_id: 4663,
    location: {
      block_number: block,
      block_hash: '0x' + String(block).padStart(64, '0'),
      transaction_hash: '0x' + String(tx).padStart(64, '0'),
      transaction_index: tx,
      log_index: log,
    },
    contract_address: '0x' + 'd'.repeat(40),
    interpretation_status: 'MATCHED',
    raw_reference: { event_id: id },
    provenance_reference: { raw_event_id: id },
  };
}

function semanticEvent(type, id, block, tx, log) {
  return {
    event_type: type,
    evidence_id: id,
    chain_id: 4663,
    pool_id: '0xpool',
    block_number: block,
    transaction_index: tx,
    log_index: log,
  };
}

test('Pool Bootstrap Formation Result integrates with Evidence Graph without rewriting evidence', () => {
  const evidence = [
    canonicalEvidence('ei:create', 100, 1, 0),
    canonicalEvidence('ei:liquidity', 101, 2, 0),
    canonicalEvidence('ei:swap', 102, 3, 0),
  ];

  const semanticEvents = [
    semanticEvent('POOL_CREATED', 'ei:create', 100, 1, 0),
    semanticEvent('LIQUIDITY_ADDED', 'ei:liquidity', 101, 2, 0),
    semanticEvent('SWAP', 'ei:swap', 102, 3, 0),
  ];

  const formationResult = detectPoolBootstrap(semanticEvents);
  assert.equal(formationResult.state, 'VALID');
  assert.ok(formationResult.formation);

  const graph = createEvidenceGraph();
  const before = evidence.map(item => JSON.stringify(item));

  for (const item of evidence) graph.projectEvidence(item);
  graph.projectFormation(formationResult.formation);

  assert.equal(graph.count().nodes, 10);
  assert.equal(graph.count().edges, 15);

  const output = graph.toJSON();
  assert.equal(
    output.edges.filter(edge => edge.type === 'REFERENCES').length,
    3
  );

  assert.deepEqual(
    evidence.map(item => JSON.stringify(item)),
    before
  );
});

test('Formation Result references exactly the evidence selected by the formation engine', () => {
  const events = [
    semanticEvent('POOL_CREATED', 'ei:create', 100, 0, 0),
    semanticEvent('LIQUIDITY_ADDED', 'ei:liquidity', 101, 0, 0),
    semanticEvent('SWAP', 'ei:early', 102, 0, 0),
    semanticEvent('SWAP', 'ei:later', 103, 0, 0),
  ];

  const result = detectPoolBootstrap(events);
  assert.equal(result.state, 'VALID');
  assert.deepEqual(result.formation.evidence_ids, [
    'ei:create',
    'ei:liquidity',
    'ei:early',
  ]);
});
