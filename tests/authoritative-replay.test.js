'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  AUTHORITY_CLASSES,
  replayAuthoritativeEvidence,
} = require('../src/core/authoritative-replay');

const { detectPoolBootstrap } = require('../src/core/pool-bootstrap-formation');

function event(event_type, evidence_id, block_number, transaction_index, log_index) {
  return {
    event_type,
    evidence_id,
    chain_id: 4663,
    pool_id: '0xpool',
    block_number,
    transaction_index,
    log_index,
  };
}

function authoritativeEnvelope(overrides = {}) {
  return {
    schema_version: '1',
    evidence_class: AUTHORITY_CLASSES.AUTHORITATIVE,
    chain_id: 4663,
    source: 'rpc:test-provider',
    evidence_id: 'ev:authoritative:001',
    request: {
      method: 'eth_getLogs',
      params: [{ fromBlock: '0x64', toBlock: '0x66' }],
    },
    response_payload: {
      preserved: true,
      raw: '{"result":"preserved"}',
    },
    observation: {
      block_number: 102,
    },
    capture: {
      captured_at: '2026-01-01T00:00:00.000Z',
    },
    events: [
      event('POOL_CREATED', 'ei:create', 100, 0, 1),
      event('LIQUIDITY_ADDED', 'ei:liquidity', 101, 0, 2),
      event('SWAP', 'ei:swap', 102, 0, 0),
    ],
    ...overrides,
  };
}

test('accepts complete authoritative provenance and preserves formation input', () => {
  const replay = replayAuthoritativeEvidence(authoritativeEnvelope());

  assert.equal(replay.evidence_class, 'AUTHORITATIVE');
  assert.equal(replay.chain_id, 4663);
  assert.equal(replay.evidence_id, 'ev:authoritative:001');

  const formation = detectPoolBootstrap(replay.events);
  assert.equal(formation.state, 'VALID');
  assert.deepEqual(formation.formation.evidence_ids, [
    'ei:create',
    'ei:liquidity',
    'ei:swap',
  ]);
});

test('rejects synthetic replay at the authoritative boundary', () => {
  assert.throws(
    () => replayAuthoritativeEvidence(
      authoritativeEnvelope({ evidence_class: 'SYNTHETIC' })
    ),
    /not AUTHORITATIVE/
  );
});

test('rejects discovery-only replay at the authoritative boundary', () => {
  assert.throws(
    () => replayAuthoritativeEvidence(
      authoritativeEnvelope({ evidence_class: 'DISCOVERY_ONLY' })
    ),
    /not AUTHORITATIVE/
  );
});

test('rejects missing provenance', () => {
  const input = authoritativeEnvelope();
  delete input.request;
  assert.throws(
    () => replayAuthoritativeEvidence(input),
    /request provenance/
  );
});

test('does not expose or mutate cursor or raw-store authority', () => {
  const input = authoritativeEnvelope();
  const before = JSON.stringify(input);
  const replay = replayAuthoritativeEvidence(input);

  assert.equal(JSON.stringify(input), before);
  assert.equal(Object.prototype.hasOwnProperty.call(replay, 'cursor'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(replay, 'raw_store'), false);
});

test('produces deterministic formation input for identical authoritative replay', () => {
  const a = replayAuthoritativeEvidence(authoritativeEnvelope());
  const b = replayAuthoritativeEvidence(authoritativeEnvelope());

  assert.deepEqual(a.events, b.events);
  assert.deepEqual(
    detectPoolBootstrap(a.events).formation.formation_id,
    detectPoolBootstrap(b.events).formation.formation_id
  );
});

test('requires preserved response payload and capture metadata', () => {
  const missingResponse = authoritativeEnvelope();
  delete missingResponse.response_payload;
  assert.throws(
    () => replayAuthoritativeEvidence(missingResponse),
    /response_payload/
  );

  const missingCapture = authoritativeEnvelope();
  delete missingCapture.capture;
  assert.throws(
    () => replayAuthoritativeEvidence(missingCapture),
    /capture metadata/
  );
});
