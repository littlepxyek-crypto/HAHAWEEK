'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  AUTHORITY_CLASSES,
  replayAuthoritativeEvidence,
} = require('../src/core/authoritative-replay');
const {
  detectPoolBootstrap,
  FORMATION_RULE_VERSION,
} = require('../src/core/pool-bootstrap-formation');

function makeEvent(event_type, evidence_id, block_number, transaction_index, log_index) {
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

function makeEnvelope() {
  return {
    schema_version: '1',
    evidence_class: AUTHORITY_CLASSES.AUTHORITATIVE,
    chain_id: 4663,
    source: 'rpc:integration-test-provider',
    evidence_id: 'ev:authoritative:integration-001',
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
      makeEvent('POOL_CREATED', 'ei:create', 100, 0, 1),
      makeEvent('LIQUIDITY_ADDED', 'ei:liquidity', 101, 0, 2),
      makeEvent('SWAP', 'ei:swap', 102, 0, 0),
    ],
  };
}

test('authoritative replay integrates into frozen Pool Bootstrap formation contract', () => {
  const replay = replayAuthoritativeEvidence(makeEnvelope());
  const result = detectPoolBootstrap(replay.events);

  assert.equal(replay.evidence_class, AUTHORITY_CLASSES.AUTHORITATIVE);
  assert.equal(result.state, 'VALID');
  assert.equal(result.formation.formation_type, 'POOL_BOOTSTRAP');
  assert.equal(result.formation.formation_rule_version, FORMATION_RULE_VERSION);
  assert.deepEqual(result.formation.evidence_ids, [
    'ei:create',
    'ei:liquidity',
    'ei:swap',
  ]);
});

test('replay remains a pure derivation boundary and does not mutate authoritative input', () => {
  const envelope = makeEnvelope();
  const before = structuredClone(envelope);
  const replay = replayAuthoritativeEvidence(envelope);

  assert.deepEqual(envelope, before);
  assert.notStrictEqual(replay.events, envelope.events);
  assert.notStrictEqual(replay.events[0], envelope.events[0]);
  assert.equal(Object.hasOwn(replay, 'cursor'), false);
  assert.equal(Object.hasOwn(replay, 'raw_store'), false);
  assert.equal(Object.hasOwn(replay, 'runtime_state'), false);
  assert.equal(Object.hasOwn(replay, 'v4_authority'), false);
});

test('identical authoritative evidence replays to identical Formation ID', () => {
  const a = detectPoolBootstrap(
    replayAuthoritativeEvidence(makeEnvelope()).events
  );
  const b = detectPoolBootstrap(
    replayAuthoritativeEvidence(makeEnvelope()).events
  );

  assert.equal(a.formation.formation_id, b.formation.formation_id);
  assert.deepEqual(a.formation.evidence_ids, b.formation.evidence_ids);
});

test('replay cannot promote non-authoritative evidence into formation input', () => {
  for (const evidence_class of [
    AUTHORITY_CLASSES.SYNTHETIC,
    AUTHORITY_CLASSES.DISCOVERY_ONLY,
  ]) {
    const envelope = makeEnvelope();
    envelope.evidence_class = evidence_class;

    assert.throws(
      () => replayAuthoritativeEvidence(envelope),
      /not AUTHORITATIVE/
    );
  }
});

test('replay requires provenance required by the frozen boundary', () => {
  const cases = [
    ['request', (input) => { delete input.request; }],
    ['response_payload', (input) => { delete input.response_payload; }],
    ['observation', (input) => { delete input.observation; }],
    ['capture', (input) => { delete input.capture; }],
  ];

  for (const [field, mutate] of cases) {
    const envelope = makeEnvelope();
    mutate(envelope);

    assert.throws(
      () => replayAuthoritativeEvidence(envelope),
      field === 'request'
        ? /request provenance/
        : field === 'response_payload'
          ? /response_payload/
          : field === 'observation'
            ? /observation provenance/
            : /capture metadata/
    );
  }
});
