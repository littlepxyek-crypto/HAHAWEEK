'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDerivedEvidenceConsumerInput } = require('../src/core/derived-evidence-consumer');

function reference() {
  return {
    schema_version: '1',
    evidence_class: 'DERIVED',
    formation_id: 'formation-459',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    pool_id: '0xpool459',
    evidence_ids: ['ev1', 'ev2', 'ev3'],
    event_order: [
      { event_type: 'POOL_CREATED', evidence_id: 'ev1', block_number: 1, transaction_index: 0, log_index: 0 },
      { event_type: 'LIQUIDITY_ADDED', evidence_id: 'ev2', block_number: 2, transaction_index: 0, log_index: 0 },
      { event_type: 'FIRST_SWAP', evidence_id: 'ev3', block_number: 3, transaction_index: 0, log_index: 0 }
    ],
    graph_reference: { node_type: 'FORMATION', node_id: 'formation-459' },
    provenance_reference: { chain_id: 4663, evidence_ids: ['ev1', 'ev2', 'ev3'] }
  };
}

test('consumer output is isolated from nested input mutation', () => {
  const input = reference();
  const result = createDerivedEvidenceConsumerInput(input);
  input.event_order[0].block_number = 999;
  input.graph_reference.node_id = 'mutated';
  input.provenance_reference.evidence_ids[0] = 'mutated';
  assert.equal(result.event_order[0].block_number, 1);
  assert.equal(result.graph_reference.node_id, 'formation-459');
  assert.equal(result.provenance_reference.evidence_ids[0], 'ev1');
});

test('consumer input is isolated from output mutation', () => {
  const input = reference();
  const result = createDerivedEvidenceConsumerInput(input);
  result.event_order[0].block_number = 888;
  result.graph_reference.node_id = 'mutated';
  result.provenance_reference.evidence_ids[0] = 'mutated';
  assert.equal(input.event_order[0].block_number, 1);
  assert.equal(input.graph_reference.node_id, 'formation-459');
  assert.equal(input.provenance_reference.evidence_ids[0], 'ev1');
});
