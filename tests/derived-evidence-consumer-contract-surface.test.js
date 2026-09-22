'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDerivedEvidenceConsumerInput } = require('../src/core/derived-evidence-consumer');

function reference() {
  return {
    schema_version: '1',
    evidence_class: 'DERIVED',
    formation_id: 'formation-461',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    pool_id: '0xpool461',
    evidence_ids: ['ev1', 'ev2', 'ev3'],
    event_order: [
      { event_type: 'POOL_CREATED', evidence_id: 'ev1', block_number: 1, transaction_index: 0, log_index: 0 },
      { event_type: 'LIQUIDITY_ADDED', evidence_id: 'ev2', block_number: 2, transaction_index: 0, log_index: 0 },
      { event_type: 'FIRST_SWAP', evidence_id: 'ev3', block_number: 3, transaction_index: 0, log_index: 0 }
    ],
    graph_reference: { node_type: 'FORMATION', node_id: 'formation-461' },
    provenance_reference: { chain_id: 4663, evidence_ids: ['ev1', 'ev2', 'ev3'] }
  };
}

test('consumer output exposes only the declared contract surface', () => {
  const result = createDerivedEvidenceConsumerInput(reference());
  assert.deepEqual(Object.keys(result).sort(), [
    'chain_id',
    'evidence_class',
    'evidence_ids',
    'event_order',
    'formation_id',
    'formation_rule_version',
    'formation_type',
    'graph_reference',
    'pool_id',
    'provenance_reference',
    'schema_version'
  ]);
});

test('consumer output has no unexpected authority or processing fields', () => {
  const input = reference();
  input.raw = { response_payload: { result: 'raw' } };
  input.cursor = { lastProcessedBlock: 10 };
  input.runtime_state = { status: 'RUNNING' };
  input.v4_authority = { active: true };
  input.created_at = new Date().toISOString();
  const result = createDerivedEvidenceConsumerInput(input);
  for (const field of ['raw', 'cursor', 'runtime_state', 'v4_authority', 'created_at']) {
    assert.equal(Object.hasOwn(result, field), false);
  }
});
