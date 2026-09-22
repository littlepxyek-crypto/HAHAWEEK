'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDerivedEvidenceConsumerInput } = require('../src/core/derived-evidence-consumer');

function reference() {
  return {
    schema_version: '1',
    evidence_class: 'DERIVED',
    formation_id: 'formation-462',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    pool_id: '0xpool462',
    evidence_ids: ['ev1', 'ev2', 'ev3'],
    event_order: [
      { event_type: 'POOL_CREATED', evidence_id: 'ev1', block_number: 1, transaction_index: 0, log_index: 0 },
      { event_type: 'LIQUIDITY_ADDED', evidence_id: 'ev2', block_number: 2, transaction_index: 0, log_index: 0 },
      { event_type: 'FIRST_SWAP', evidence_id: 'ev3', block_number: 3, transaction_index: 0, log_index: 0 }
    ],
    graph_reference: { node_type: 'FORMATION', node_id: 'formation-462' },
    provenance_reference: { chain_id: 4663, evidence_ids: ['ev1', 'ev2', 'ev3'] }
  };
}

test('consumer preserves schema version and lineage on equivalent inputs', () => {
  const result = createDerivedEvidenceConsumerInput(reference());
  assert.equal(result.schema_version, '1');
  assert.equal(result.evidence_class, 'DERIVED');
  assert.equal(result.formation_id, 'formation-462');
  assert.equal(result.formation_rule_version, 'pool-bootstrap-v1');
  assert.equal(result.chain_id, 4663);
});

test('consumer output is detached from mutable nested source data', () => {
  const input = reference();
  const result = createDerivedEvidenceConsumerInput(input);
  input.event_order[0].event_type = 'MUTATED';
  input.graph_reference.node_id = 'MUTATED';
  input.provenance_reference.evidence_ids[0] = 'MUTATED';
  assert.equal(result.event_order[0].event_type, 'POOL_CREATED');
  assert.equal(result.graph_reference.node_id, 'formation-462');
  assert.equal(result.provenance_reference.evidence_ids[0], 'ev1');
});
