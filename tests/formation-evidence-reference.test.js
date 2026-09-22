'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFormationEvidenceReference } = require('../src/core/formation-evidence-reference');

function validFormation(overrides = {}) {
  return {
    formation_id: 'formation:v1:abc',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    pool_id: '0xpool',
    state: 'VALID',
    evidence_ids: ['ei:create', 'ei:liquidity', 'ei:swap'],
    event_order: [
      { event_type: 'POOL_CREATED', evidence_id: 'ei:create', block_number: 100, transaction_index: 0, log_index: 1 },
      { event_type: 'LIQUIDITY_ADDED', evidence_id: 'ei:liquidity', block_number: 101, transaction_index: 0, log_index: 2 },
      { event_type: 'SWAP', evidence_id: 'ei:swap', block_number: 102, transaction_index: 0, log_index: 0 },
    ],
    graph_reference: { node_type: 'FORMATION', node_id: 'formation:v1:abc' },
    provenance_reference: { chain_id: 4663, evidence_ids: ['ei:create', 'ei:liquidity', 'ei:swap'] },
    created_at: '2026-09-22T00:00:00.000Z',
    ...overrides,
  };
}

test('creates a DERIVED formation evidence reference', () => {
  const result = createFormationEvidenceReference(validFormation());
  assert.equal(result.schema_version, '1');
  assert.equal(result.evidence_class, 'DERIVED');
  assert.equal(result.formation_id, 'formation:v1:abc');
  assert.deepEqual(result.evidence_ids, ['ei:create', 'ei:liquidity', 'ei:swap']);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'created_at'), false);
});

test('derived reference is deterministic when processing metadata changes', () => {
  const first = createFormationEvidenceReference(validFormation({ created_at: '2026-09-22T00:00:00.000Z' }));
  const second = createFormationEvidenceReference(validFormation({ created_at: '2026-09-22T00:01:00.000Z' }));
  assert.deepEqual(first, second);
});

test('derived reference does not mutate or retain formation input', () => {
  const formation = validFormation();
  const before = structuredClone(formation);
  const result = createFormationEvidenceReference(formation);
  assert.deepEqual(formation, before);
  result.event_order[0].event_type = 'MUTATED';
  result.provenance_reference.evidence_ids.push('mutated');
  assert.deepEqual(formation, before);
});

test('rejects non-VALID formation states', () => {
  assert.throws(() => createFormationEvidenceReference(validFormation({ state: 'CANDIDATE' })), /VALID formation/);
});

test('rejects evidence lineage mismatch', () => {
  assert.throws(() => createFormationEvidenceReference(validFormation({ provenance_reference: { chain_id: 4663, evidence_ids: ['ei:create', 'ei:liquidity', 'ei:other'] } })), /provenance evidence mismatch/);
});

test('rejects event evidence not selected by formation', () => {
  const formation = validFormation();
  formation.event_order[2] = { event_type: 'SWAP', evidence_id: 'ei:other', block_number: 102, transaction_index: 0, log_index: 0 };
  assert.throws(() => createFormationEvidenceReference(formation), /not selected/);
});

test('rejects malformed graph reference', () => {
  assert.throws(() => createFormationEvidenceReference(validFormation({ graph_reference: { node_type: 'FORMATION', node_id: 'formation:v1:other' } })), /graph_reference mismatch/);
});
