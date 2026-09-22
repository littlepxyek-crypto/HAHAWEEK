'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { AUTHORITY_CLASSES } = require('../src/core/authoritative-replay');
const {
  createAuthoritativeEvidenceEnvelope,
} = require('../src/core/authoritative-evidence');

function makeInput() {
  return {
    schema_version: '1',
    evidence_class: AUTHORITY_CLASSES.AUTHORITATIVE,
    chain_id: 4663,
    source: 'rpc:fixture-provider',
    evidence_id: 'ev:authoritative:001',
    request: {
      method: 'eth_getLogs',
      params: [{ fromBlock: '0x64', toBlock: '0x66' }],
    },
    response_payload: {
      raw: '{"jsonrpc":"2.0","result":[{"logIndex":"0x0"}]}',
      preserved: true,
    },
    observation: {
      block_number: 102,
    },
    capture: {
      captured_at: '2026-01-01T00:00:00.000Z',
    },
    events: [
      {
        event_type: 'POOL_CREATED',
        evidence_id: 'ei:create',
        chain_id: 4663,
        pool_id: '0xpool',
        block_number: 100,
        transaction_index: 0,
        log_index: 0,
      },
    ],
  };
}

test('creates an AUTHORITATIVE envelope with required provenance intact', () => {
  const input = makeInput();
  const envelope = createAuthoritativeEvidenceEnvelope(input);

  assert.equal(envelope.evidence_class, AUTHORITY_CLASSES.AUTHORITATIVE);
  assert.equal(envelope.chain_id, 4663);
  assert.equal(envelope.source, input.source);
  assert.deepEqual(envelope.request, input.request);
  assert.deepEqual(envelope.response_payload, input.response_payload);
  assert.deepEqual(envelope.observation, input.observation);
  assert.deepEqual(envelope.capture, input.capture);
  assert.deepEqual(envelope.events, input.events);
});

test('preserves raw response representation without normalization', () => {
  const input = makeInput();
  input.response_payload.raw = '  {"result":null}\n';

  const envelope = createAuthoritativeEvidenceEnvelope(input);

  assert.equal(envelope.response_payload.raw, '  {"result":null}\n');
});

test('does not mutate or alias capture input', () => {
  const input = makeInput();
  const before = structuredClone(input);
  const envelope = createAuthoritativeEvidenceEnvelope(input);

  assert.deepEqual(input, before);
  assert.notStrictEqual(envelope.request, input.request);
  assert.notStrictEqual(envelope.response_payload, input.response_payload);
  assert.notStrictEqual(envelope.events, input.events);
});

test('rejects non-authoritative evidence classes', () => {
  for (const evidence_class of [
    AUTHORITY_CLASSES.SYNTHETIC,
    AUTHORITY_CLASSES.DISCOVERY_ONLY,
  ]) {
    const input = makeInput();
    input.evidence_class = evidence_class;

    assert.throws(
      () => createAuthoritativeEvidenceEnvelope(input),
      /must be AUTHORITATIVE/
    );
  }
});

test('rejects missing raw response and provenance', () => {
  const cases = [
    ['response_payload', (input) => delete input.response_payload],
    ['request', (input) => delete input.request],
    ['observation', (input) => delete input.observation],
    ['capture', (input) => delete input.capture],
  ];

  for (const [field, mutate] of cases) {
    const input = makeInput();
    mutate(input);

    assert.throws(
      () => createAuthoritativeEvidenceEnvelope(input),
      new RegExp(field.replace('_', '\\_'))
    );
  }
});

test('does not expose cursor, runtime state, raw-store, or V4 authority', () => {
  const envelope = createAuthoritativeEvidenceEnvelope(makeInput());

  for (const field of [
    'cursor',
    'runtime_state',
    'raw_store',
    'v4_authority',
  ]) {
    assert.equal(Object.hasOwn(envelope, field), false);
  }
});

test('rejects request.params explicitly set to undefined', () => {
  const input = makeInput();
  input.request.params = undefined;
  assert.throws(
    () => createAuthoritativeEvidenceEnvelope(input),
    /request\.params/
  );
});
