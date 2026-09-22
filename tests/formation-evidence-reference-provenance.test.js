'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFormationEvidenceReference } = require('../src/core/formation-evidence-reference');

function formation() {
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

test('STEP 453 preserves DERIVED lineage as the complete provenance contract', () => {
  const ref = createFormationEvidenceReference(formation());
  assert.equal(ref.evidence_class, 'DERIVED');
  assert.equal(ref.schema_version, '1');
  assert.deepEqual(ref.provenance_reference, { chain_id: 4663, evidence_ids: ['e1', 'e2', 'e3'] });
  assert.deepEqual(ref.evidence_ids, ['e1', 'e2', 'e3']);
});

test('STEP 453 rejects provenance chain mismatch', () => {
  const f = formation();
  f.provenance_reference.chain_id = 1;
  assert.throws(() => createFormationEvidenceReference(f), /provenance chain mismatch/);
});

test('STEP 453 rejects provenance evidence coverage mismatch', () => {
  const f = formation();
  f.provenance_reference.evidence_ids = ['e1', 'e2'];
  assert.throws(() => createFormationEvidenceReference(f), /provenance evidence mismatch/);
});

test('STEP 453 excludes processing metadata from the provenance reference', () => {
  const f = formation();
  f.created_at = '2099-01-01T00:00:00.000Z';
  const ref = createFormationEvidenceReference(f);
  assert.equal('created_at' in ref, false);
  assert.equal('created_at' in ref.provenance_reference, false);
});
