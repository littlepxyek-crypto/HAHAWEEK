'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDerivedEvidenceConsumerInput } = require('../src/core/derived-evidence-consumer');

function valid() {
  return {
    schema_version: '1',
    evidence_class: 'DERIVED',
    formation_id: 'formation-464',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    pool_id: '0xpool464',
    evidence_ids: ['ev1', 'ev2', 'ev3'],
    event_order: [
      { event_type: 'POOL_CREATED', evidence_id: 'ev1', block_number: 1, transaction_index: 0, log_index: 0 },
      { event_type: 'LIQUIDITY_ADDED', evidence_id: 'ev2', block_number: 2, transaction_index: 0, log_index: 0 },
      { event_type: 'FIRST_SWAP', evidence_id: 'ev3', block_number: 3, transaction_index: 0, log_index: 0 }
    ],
    graph_reference: { node_type: 'FORMATION', node_id: 'formation-464' },
    provenance_reference: { chain_id: 4663, evidence_ids: ['ev1', 'ev2', 'ev3'] }
  };
}

test('valid DERIVED consumer input is accepted', () => {
  assert.equal(createDerivedEvidenceConsumerInput(valid()).formation_id, 'formation-464');
});

test('authority and schema boundaries reject invalid inputs', () => {
  for (const mutate of [
    value => { value.evidence_class = 'AUTHORITATIVE'; },
    value => { value.schema_version = '2'; },
    value => { value.formation_id = ''; },
    value => { value.chain_id = 0; },
    value => { value.evidence_ids = ['ev1', 'ev1', 'ev3']; },
    value => { value.event_order[0].evidence_id = 'unknown'; },
    value => { value.graph_reference.node_id = 'wrong'; },
    value => { value.provenance_reference.chain_id = 1; }
  ]) {
    const input = valid();
    mutate(input);
    assert.throws(() => createDerivedEvidenceConsumerInput(input), TypeError);
  }
});
