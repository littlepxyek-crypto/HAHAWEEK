'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFormationEvidenceReference } = require('../src/core/formation-evidence-reference');
const { createDerivedEvidenceConsumerInput } = require('../src/core/derived-evidence-consumer');

function validReference() {
  return createFormationEvidenceReference({
    state: 'VALID',
    formation_id: 'formation-455',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    pool_id: '0xpool455',
    evidence_ids: ['ev-created', 'ev-liquidity', 'ev-swap'],
    event_order: [
      { event_type: 'POOL_CREATED', evidence_id: 'ev-created', block_number: 10, transaction_index: 0, log_index: 0 },
      { event_type: 'LIQUIDITY_ADDED', evidence_id: 'ev-liquidity', block_number: 11, transaction_index: 0, log_index: 0 },
      { event_type: 'FIRST_SWAP', evidence_id: 'ev-swap', block_number: 12, transaction_index: 0, log_index: 0 }
    ],
    graph_reference: { node_type: 'FORMATION', node_id: 'formation-455' },
    provenance_reference: { chain_id: 4663, evidence_ids: ['ev-created', 'ev-liquidity', 'ev-swap'] }
  });
}

test('preserves formation lineage across the derived consumer boundary', () => {
  const reference = validReference();
  const result = createDerivedEvidenceConsumerInput(reference);
  assert.equal(result.formation_id, reference.formation_id);
  assert.equal(result.formation_type, reference.formation_type);
  assert.equal(result.formation_rule_version, reference.formation_rule_version);
  assert.equal(result.chain_id, reference.chain_id);
  assert.equal(result.pool_id, reference.pool_id);
  assert.deepEqual(result.evidence_ids, reference.evidence_ids);
  assert.deepEqual(result.event_order, reference.event_order);
  assert.deepEqual(result.graph_reference, reference.graph_reference);
  assert.deepEqual(result.provenance_reference, reference.provenance_reference);
});

test('rejects event/evidence lineage drift', () => {
  const reference = validReference();
  reference.event_order[2].evidence_id = 'unselected';
  assert.throws(() => createDerivedEvidenceConsumerInput(reference), /event evidence ID is not selected/);
});

test('rejects graph lineage drift', () => {
  const reference = validReference();
  reference.graph_reference.node_id = 'other-formation';
  assert.throws(() => createDerivedEvidenceConsumerInput(reference), /graph_reference mismatch/);
});

test('rejects provenance evidence ordering drift', () => {
  const reference = validReference();
  reference.provenance_reference.evidence_ids = ['ev-swap', 'ev-liquidity', 'ev-created'];
  assert.throws(() => createDerivedEvidenceConsumerInput(reference), /provenance evidence mismatch/);
});
