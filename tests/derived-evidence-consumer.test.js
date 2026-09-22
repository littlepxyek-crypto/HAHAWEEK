'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFormationEvidenceReference } = require('../src/core/formation-evidence-reference');
const { createDerivedEvidenceConsumerInput } = require('../src/core/derived-evidence-consumer');

function formation() {
  return {
    state: 'VALID',
    formation_id: 'formation-454',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    pool_id: '0xpool454',
    evidence_ids: ['ev-created', 'ev-liquidity', 'ev-swap'],
    event_order: [
      { event_type: 'POOL_CREATED', evidence_id: 'ev-created', block_number: 10, transaction_index: 0, log_index: 0 },
      { event_type: 'LIQUIDITY_ADDED', evidence_id: 'ev-liquidity', block_number: 11, transaction_index: 0, log_index: 0 },
      { event_type: 'FIRST_SWAP', evidence_id: 'ev-swap', block_number: 12, transaction_index: 0, log_index: 0 }
    ],
    graph_reference: { node_type: 'FORMATION', node_id: 'formation-454' },
    provenance_reference: { chain_id: 4663, evidence_ids: ['ev-created', 'ev-liquidity', 'ev-swap'] },
    created_at: 'processing-metadata-only'
  };
}
function reference() { return createFormationEvidenceReference(formation()); }

test('accepts frozen DERIVED evidence reference and preserves lineage', () => {
  const result = createDerivedEvidenceConsumerInput(reference());
  assert.equal(result.evidence_class, 'DERIVED');
  assert.equal(result.formation_id, 'formation-454');
  assert.equal(result.chain_id, 4663);
  assert.deepEqual(result.evidence_ids, ['ev-created', 'ev-liquidity', 'ev-swap']);
  assert.deepEqual(result.provenance_reference, { chain_id: 4663, evidence_ids: ['ev-created', 'ev-liquidity', 'ev-swap'] });
});
test('rejects authority-contaminated evidence class', () => {
  const input = reference();
  input.evidence_class = 'AUTHORITATIVE';
  assert.throws(() => createDerivedEvidenceConsumerInput(input), /DERIVED evidence only/);
});
test('rejects provenance lineage mismatch', () => {
  const input = reference();
  input.provenance_reference.chain_id = 1;
  assert.throws(() => createDerivedEvidenceConsumerInput(input), /provenance chain mismatch/);
});
test('deep-clones downstream consumer input', () => {
  const input = reference();
  const result = createDerivedEvidenceConsumerInput(input);
  result.event_order[0].event_type = 'MUTATED';
  result.graph_reference.node_id = 'mutated';
  result.provenance_reference.evidence_ids[0] = 'mutated';
  assert.equal(input.event_order[0].event_type, 'POOL_CREATED');
  assert.equal(input.graph_reference.node_id, 'formation-454');
  assert.equal(input.provenance_reference.evidence_ids[0], 'ev-created');
});
test('excludes processing metadata from consumer contract', () => {
  const result = createDerivedEvidenceConsumerInput(reference());
  assert.equal(Object.hasOwn(result, 'created_at'), false);
});
test('repeated construction has deterministic semantic output', () => {
  const input = reference();
  assert.deepEqual(createDerivedEvidenceConsumerInput(input), createDerivedEvidenceConsumerInput(input));
});
