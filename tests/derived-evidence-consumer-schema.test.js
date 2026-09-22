'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDerivedEvidenceConsumerInput } = require('../src/core/derived-evidence-consumer');

function baseReference() {
  return {
    schema_version: '1',
    evidence_class: 'DERIVED',
    formation_id: 'formation-457',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    pool_id: '0xpool457',
    evidence_ids: ['ev1', 'ev2', 'ev3'],
    event_order: [
      { event_type: 'POOL_CREATED', evidence_id: 'ev1', block_number: 1, transaction_index: 0, log_index: 0 },
      { event_type: 'LIQUIDITY_ADDED', evidence_id: 'ev2', block_number: 2, transaction_index: 0, log_index: 0 },
      { event_type: 'FIRST_SWAP', evidence_id: 'ev3', block_number: 3, transaction_index: 0, log_index: 0 }
    ],
    graph_reference: { node_type: 'FORMATION', node_id: 'formation-457' },
    provenance_reference: { chain_id: 4663, evidence_ids: ['ev1', 'ev2', 'ev3'] }
  };
}

test('accepts the frozen schema version only', () => {
  const input = baseReference();
  assert.equal(createDerivedEvidenceConsumerInput(input).schema_version, '1');
});

test('rejects unsupported schema versions', () => {
  const input = baseReference();
  input.schema_version = '2';
  assert.throws(() => createDerivedEvidenceConsumerInput(input), /schema_version 1/);
});

test('rejects malformed identity fields', () => {
  for (const field of ['formation_id', 'formation_type', 'formation_rule_version', 'pool_id']) {
    const input = baseReference();
    input[field] = '';
    assert.throws(() => createDerivedEvidenceConsumerInput(input), new RegExp(field));
  }
});

test('rejects invalid chain identifiers', () => {
  const input = baseReference();
  input.chain_id = 0;
  assert.throws(() => createDerivedEvidenceConsumerInput(input), /valid chain_id/);
});
