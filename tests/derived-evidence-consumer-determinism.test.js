'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDerivedEvidenceConsumerInput } = require('../src/core/derived-evidence-consumer');

function reference() {
  return {
    schema_version: '1',
    evidence_class: 'DERIVED',
    formation_id: 'formation-460',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    pool_id: '0xpool460',
    evidence_ids: ['ev1', 'ev2', 'ev3'],
    event_order: [
      { event_type: 'POOL_CREATED', evidence_id: 'ev1', block_number: 1, transaction_index: 0, log_index: 0 },
      { event_type: 'LIQUIDITY_ADDED', evidence_id: 'ev2', block_number: 2, transaction_index: 0, log_index: 0 },
      { event_type: 'FIRST_SWAP', evidence_id: 'ev3', block_number: 3, transaction_index: 0, log_index: 0 }
    ],
    graph_reference: { node_type: 'FORMATION', node_id: 'formation-460' },
    provenance_reference: { chain_id: 4663, evidence_ids: ['ev1', 'ev2', 'ev3'] }
  };
}

test('repeated construction is semantically deterministic', () => {
  const first = createDerivedEvidenceConsumerInput(reference());
  const second = createDerivedEvidenceConsumerInput(reference());
  assert.deepEqual(first, second);
});

test('output excludes processing-time metadata', () => {
  const input = reference();
  input.created_at = new Date().toISOString();
  input.processed_at = new Date().toISOString();
  const result = createDerivedEvidenceConsumerInput(input);
  assert.equal(Object.hasOwn(result, 'created_at'), false);
  assert.equal(Object.hasOwn(result, 'processed_at'), false);
});
