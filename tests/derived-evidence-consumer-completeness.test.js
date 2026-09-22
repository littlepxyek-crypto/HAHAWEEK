'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDerivedEvidenceConsumerInput } = require('../src/core/derived-evidence-consumer');

function reference() {
  return {
    schema_version: '1',
    evidence_class: 'DERIVED',
    formation_id: 'formation-458',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    pool_id: '0xpool458',
    evidence_ids: ['ev1', 'ev2', 'ev3'],
    event_order: [
      { event_type: 'POOL_CREATED', evidence_id: 'ev1', block_number: 1, transaction_index: 0, log_index: 0 },
      { event_type: 'LIQUIDITY_ADDED', evidence_id: 'ev2', block_number: 2, transaction_index: 0, log_index: 0 },
      { event_type: 'FIRST_SWAP', evidence_id: 'ev3', block_number: 3, transaction_index: 0, log_index: 0 }
    ],
    graph_reference: { node_type: 'FORMATION', node_id: 'formation-458' },
    provenance_reference: { chain_id: 4663, evidence_ids: ['ev1', 'ev2', 'ev3'] }
  };
}

test('accepts complete aligned evidence and event coverage', () => {
  const result = createDerivedEvidenceConsumerInput(reference());
  assert.equal(result.evidence_ids.length, result.event_order.length);
});

test('rejects missing event coverage', () => {
  const input = reference();
  input.event_order.pop();
  assert.throws(() => createDerivedEvidenceConsumerInput(input), /coverage mismatch/);
});

test('rejects duplicate evidence IDs', () => {
  const input = reference();
  input.evidence_ids[2] = 'ev2';
  assert.throws(() => createDerivedEvidenceConsumerInput(input), /unique evidence_ids/);
});

test('rejects duplicate event evidence IDs', () => {
  const input = reference();
  input.event_order[2].evidence_id = 'ev2';
  assert.throws(() => createDerivedEvidenceConsumerInput(input), /unique event_order evidence IDs/);
});
