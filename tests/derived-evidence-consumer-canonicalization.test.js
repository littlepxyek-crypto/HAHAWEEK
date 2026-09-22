'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDerivedEvidenceConsumerInput } = require('../src/core/derived-evidence-consumer');

function reference() {
  return {
    schema_version: '1',
    evidence_class: 'DERIVED',
    formation_id: 'formation-463',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    pool_id: '0xpool463',
    evidence_ids: ['ev1', 'ev2', 'ev3'],
    event_order: [
      { event_type: 'POOL_CREATED', evidence_id: 'ev1', block_number: 1, transaction_index: 0, log_index: 0 },
      { event_type: 'LIQUIDITY_ADDED', evidence_id: 'ev2', block_number: 2, transaction_index: 0, log_index: 0 },
      { event_type: 'FIRST_SWAP', evidence_id: 'ev3', block_number: 3, transaction_index: 0, log_index: 0 }
    ],
    graph_reference: { node_type: 'FORMATION', node_id: 'formation-463' },
    provenance_reference: { chain_id: 4663, evidence_ids: ['ev1', 'ev2', 'ev3'] }
  };
}

test('equivalent canonical references produce identical consumer outputs', () => {
  const a = reference();
  const b = structuredClone(reference());
  assert.deepEqual(createDerivedEvidenceConsumerInput(a), createDerivedEvidenceConsumerInput(b));
});

test('consumer does not derive identity from object insertion order', () => {
  const input = reference();
  const reordered = {
    provenance_reference: input.provenance_reference,
    graph_reference: input.graph_reference,
    event_order: input.event_order,
    evidence_ids: input.evidence_ids,
    pool_id: input.pool_id,
    chain_id: input.chain_id,
    formation_rule_version: input.formation_rule_version,
    formation_type: input.formation_type,
    formation_id: input.formation_id,
    evidence_class: input.evidence_class,
    schema_version: input.schema_version
  };
  assert.deepEqual(createDerivedEvidenceConsumerInput(input), createDerivedEvidenceConsumerInput(reordered));
});
