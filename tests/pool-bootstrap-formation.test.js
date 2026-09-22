'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { detectPoolBootstrap, FORMATION_RULE_VERSION } = require('../src/core/pool-bootstrap-formation');

function event(event_type, evidence_id, block_number, transaction_index, log_index, extra = {}) {
  return {
    event_type,
    evidence_id,
    chain_id: 4663,
    pool_id: '0xpool',
    block_number,
    transaction_index,
    log_index,
    ...extra,
  };
}

test('detects a valid Pool Bootstrap in canonical temporal order', () => {
  const result = detectPoolBootstrap([
    event('POOL_CREATED', 'ei:create', 100, 0, 1, { event_time: '2026-01-01T00:00:00Z' }),
    event('LIQUIDITY_ADDED', 'ei:liquidity', 101, 0, 2),
    event('SWAP', 'ei:swap', 101, 1, 0, { event_time: '2026-01-01T00:01:00Z' }),
  ]);

  assert.equal(result.state, 'VALID');
  assert.equal(result.formation.formation_type, 'POOL_BOOTSTRAP');
  assert.equal(result.formation.formation_rule_version, FORMATION_RULE_VERSION);
  assert.deepEqual(result.formation.evidence_ids, [
    'ei:create',
    'ei:liquidity',
    'ei:swap',
  ]);
  assert.equal(result.formation.graph_reference.node_type, 'FORMATION');
  assert.equal(result.formation.graph_reference.node_id, result.formation.formation_id);
  assert.deepEqual(result.formation.provenance_reference, {
    chain_id: 4663,
    evidence_ids: ['ei:create', 'ei:liquidity', 'ei:swap'],
  });
  assert.match(result.formation.created_at, /^\d{4}-\d{2}-\d{2}T/);
});

test('selects the earliest valid swap by block, transaction, and log order', () => {
  const result = detectPoolBootstrap([
    event('POOL_CREATED', 'ei:create', 100, 0, 1),
    event('LIQUIDITY_ADDED', 'ei:liquidity', 101, 0, 2),
    event('SWAP', 'ei:later', 103, 0, 0),
    event('SWAP', 'ei:first', 102, 9, 3),
  ]);

  assert.equal(result.state, 'VALID');
  assert.equal(result.formation.evidence_ids[2], 'ei:first');
});

test('does not treat missing swap as invalid formation', () => {
  const result = detectPoolBootstrap([
    event('POOL_CREATED', 'ei:create', 100, 0, 1),
    event('LIQUIDITY_ADDED', 'ei:liquidity', 101, 0, 2),
  ]);

  assert.equal(result.state, 'CANDIDATE');
  assert.deepEqual(result.missing, ['FIRST_SWAP']);
  assert.equal(result.formation, null);
});

test('does not allow liquidity before pool creation to satisfy the sequence', () => {
  const result = detectPoolBootstrap([
    event('LIQUIDITY_ADDED', 'ei:liquidity', 99, 0, 0),
    event('POOL_CREATED', 'ei:create', 100, 0, 1),
    event('SWAP', 'ei:swap', 101, 0, 0),
  ]);

  assert.equal(result.state, 'PARTIAL');
  assert.ok(result.missing.includes('LIQUIDITY_ADDED'));
});

test('does not use a swap before liquidity as FIRST_SWAP', () => {
  const result = detectPoolBootstrap([
    event('POOL_CREATED', 'ei:create', 100, 0, 1),
    event('SWAP', 'ei:too-early', 100, 0, 2),
    event('LIQUIDITY_ADDED', 'ei:liquidity', 101, 0, 0),
    event('SWAP', 'ei:valid', 102, 0, 0),
  ]);

  assert.equal(result.state, 'VALID');
  assert.equal(result.formation.evidence_ids[2], 'ei:valid');
});

test('rejects mixed pool contexts instead of silently merging them', () => {
  assert.throws(
    () => detectPoolBootstrap([
      event('POOL_CREATED', 'ei:create', 100, 0, 1),
      { ...event('LIQUIDITY_ADDED', 'ei:liquidity', 101, 0, 2), pool_id: '0xother' },
    ]),
    /MULTIPLE_POOL_CONTEXTS/
  );
});

test('formation identity is deterministic for identical evidence', () => {
  const input = [
    event('POOL_CREATED', 'ei:create', 100, 0, 1),
    event('LIQUIDITY_ADDED', 'ei:liquidity', 101, 0, 2),
    event('SWAP', 'ei:swap', 102, 0, 0),
  ];
  const a = detectPoolBootstrap(input);
  const b = detectPoolBootstrap([...input].reverse());
  assert.equal(a.formation.formation_id, b.formation.formation_id);
});


test('formation detection does not mutate or retain mutable input references', () => {
  const input = [
    event('POOL_CREATED', 'ei:create', 100, 0, 1, { metadata: { tags: ['origin'] } }),
    event('LIQUIDITY_ADDED', 'ei:liquidity', 101, 0, 2),
    event('SWAP', 'ei:swap', 102, 0, 0),
  ];
  const before = structuredClone(input);
  const result = detectPoolBootstrap(input);

  assert.deepEqual(input, before);
  result.formation.event_order[0].event_type = 'MUTATED';
  result.formation.provenance_reference.evidence_ids.push('mutated');
  assert.deepEqual(input, before);
});
