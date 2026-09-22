'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDerivedEvidenceConsumerInput } = require('../src/core/derived-evidence-consumer');

function reference() {
  return {
    schema_version: '1',
    evidence_class: 'DERIVED',
    formation_id: 'formation-456',
    formation_type: 'POOL_BOOTSTRAP',
    formation_rule_version: 'pool-bootstrap-v1',
    chain_id: 4663,
    pool_id: '0xpool456',
    evidence_ids: ['ev1', 'ev2', 'ev3'],
    event_order: [
      { event_type: 'POOL_CREATED', evidence_id: 'ev1', block_number: 1, transaction_index: 0, log_index: 0 },
      { event_type: 'LIQUIDITY_ADDED', evidence_id: 'ev2', block_number: 2, transaction_index: 0, log_index: 0 },
      { event_type: 'FIRST_SWAP', evidence_id: 'ev3', block_number: 3, transaction_index: 0, log_index: 0 }
    ],
    graph_reference: { node_type: 'FORMATION', node_id: 'formation-456' },
    provenance_reference: { chain_id: 4663, evidence_ids: ['ev1', 'ev2', 'ev3'] }
  };
}

test('accepts only DERIVED authority class', () => {
  const input = reference();
  input.evidence_class = 'AUTHORITATIVE';
  assert.throws(() => createDerivedEvidenceConsumerInput(input), /accepts DERIVED evidence only/);
});

test('does not retain authoritative response or request material', () => {
  const input = reference();
  input.response_payload = { result: 'raw' };
  input.request = { method: 'eth_getLogs', params: [] };
  const result = createDerivedEvidenceConsumerInput(input);
  assert.equal(Object.hasOwn(result, 'response_payload'), false);
  assert.equal(Object.hasOwn(result, 'request'), false);
});

test('does not expose runtime authority fields', () => {
  const input = reference();
  input.cursor = { lastProcessedBlock: 100 };
  input.runtime_state = { status: 'RUNNING' };
  input.v4_authority = { active: true };
  const result = createDerivedEvidenceConsumerInput(input);
  assert.equal(Object.hasOwn(result, 'cursor'), false);
  assert.equal(Object.hasOwn(result, 'runtime_state'), false);
  assert.equal(Object.hasOwn(result, 'v4_authority'), false);
});
