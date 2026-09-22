'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  AUTHORITY_CLASSES,
  replayAuthoritativeEvidence,
} = require('../src/core/authoritative-replay');

const {
  createAuthoritativeEvidenceEnvelope,
} = require('../src/core/authoritative-evidence');

function baseInput() {
  return {
    schema_version: '1',
    evidence_class: AUTHORITY_CLASSES.AUTHORITATIVE,
    chain_id: 4663,
    source: 'rpc:adversarial-test-provider',
    evidence_id: 'ev:adversarial:001',
    request: {
      method: 'eth_getLogs',
      params: [],
    },
    response_payload: {
      jsonrpc: '2.0',
      id: 1,
      result: [],
    },
    observation: {
      block_number: 100,
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

test('rejects non-object and array replay envelopes', () => {
  assert.throws(
    () => replayAuthoritativeEvidence(null),
    /must be an object/
  );
  assert.throws(
    () => replayAuthoritativeEvidence([]),
    /must be an object/
  );
});

test('rejects invalid schema and chain identifiers', () => {
  const schema = baseInput();
  schema.schema_version = '2';
  assert.throws(
    () => replayAuthoritativeEvidence(schema),
    /unsupported authoritative replay schema version/
  );

  const chain = baseInput();
  chain.chain_id = -1;
  assert.throws(
    () => replayAuthoritativeEvidence(chain),
    /valid chain_id/
  );
});

test('rejects empty source and evidence identifiers', () => {
  const source = baseInput();
  source.source = '';
  assert.throws(
    () => replayAuthoritativeEvidence(source),
    /non-empty source/
  );

  const evidence = baseInput();
  evidence.evidence_id = '';
  assert.throws(
    () => replayAuthoritativeEvidence(evidence),
    /non-empty evidence_id/
  );
});

test('rejects missing request method or params', () => {
  const method = baseInput();
  method.request.method = '';
  assert.throws(
    () => replayAuthoritativeEvidence(method),
    /non-empty request.method/
  );

  const params = baseInput();
  delete params.request.params;
  assert.throws(
    () => replayAuthoritativeEvidence(params),
    /request.params/
  );
});

test('rejects undefined preserved raw response payload', () => {
  const input = baseInput();
  input.response_payload = undefined;

  assert.throws(
    () => createAuthoritativeEvidenceEnvelope(input),
    /response_payload/
  );

  assert.throws(
    () => replayAuthoritativeEvidence(input),
    /response_payload/
  );
});

test('rejects invalid observation and capture metadata', () => {
  const observation = baseInput();
  observation.observation.block_number = -1;
  assert.throws(
    () => replayAuthoritativeEvidence(observation),
    /observation.block_number/
  );

  const capture = baseInput();
  capture.capture.captured_at = '';
  assert.throws(
    () => replayAuthoritativeEvidence(capture),
    /non-empty capture.captured_at/
  );
});

test('rejects empty derived event set', () => {
  const input = baseInput();
  input.events = [];

  assert.throws(
    () => replayAuthoritativeEvidence(input),
    /at least one derived event/
  );
});
