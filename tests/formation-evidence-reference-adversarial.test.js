'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFormationEvidenceReference } = require('../src/core/formation-evidence-reference');

function validFormation() {
  return {
    state: 'VALID',
    formation_id: 'formation:pool-bootstrap:4663:pool-1:e1:e2:e3',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    pool_id: 'pool-1',
    evidence_ids: ['e1', 'e2', 'e3'],
    event_order: [
      { event_type: 'POOL_CREATED', evidence_id: 'e1', block_number: 10, transaction_index: 0, log_index: 0 },
      { event_type: 'LIQUIDITY_ADDED', evidence_id: 'e2', block_number: 11, transaction_index: 0, log_index: 0 },
      { event_type: 'FIRST_SWAP', evidence_id: 'e3', block_number: 12, transaction_index: 0, log_index: 0 },
    ],
    graph_reference: { node_type: 'FORMATION', node_id: 'formation:pool-bootstrap:4663:pool-1:e1:e2:e3' },
    provenance_reference: { chain_id: 4663, evidence_ids: ['e1', 'e2', 'e3'] },
  };
}

test('STEP 452 keeps authoritative raw payload fields out of the DERIVED reference', () => {
  const formation = validFormation();
  formation.response_payload = { result: 'must not cross the boundary' };
  formation.request = { method: 'eth_getLogs', params: [] };
  const reference = createFormationEvidenceReference(formation);
  assert.equal(reference.evidence_class, 'DERIVED');
  assert.equal('response_payload' in reference, false);
  assert.equal('request' in reference, false);
});

test('STEP 452 rejects incomplete evidence lineage coverage', () => {
  const formation = validFormation();
  formation.evidence_ids = ['e1', 'e2', 'e3', 'e4'];
  assert.throws(() => createFormationEvidenceReference(formation), /coverage mismatch/);
});

test('STEP 452 rejects provenance evidence ordering mismatch', () => {
  const formation = validFormation();
  formation.provenance_reference.evidence_ids = ['e2', 'e1', 'e3'];
  assert.throws(() => createFormationEvidenceReference(formation), /provenance evidence mismatch/);
});

test('STEP 452 output remains isolated from nested input mutation', () => {
  const formation = validFormation();
  const reference = createFormationEvidenceReference(formation);
  formation.event_order[0].block_number = 999;
  formation.graph_reference.node_id = 'tampered';
  formation.provenance_reference.evidence_ids[0] = 'tampered';
  assert.equal(reference.event_order[0].block_number, 10);
  assert.equal(reference.graph_reference.node_id, formation.formation_id);
  assert.equal(reference.provenance_reference.evidence_ids[0], 'e1');
});
