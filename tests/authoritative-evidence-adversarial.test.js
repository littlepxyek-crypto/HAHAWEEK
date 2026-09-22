'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { AUTHORITY_CLASSES } = require('../src/core/authoritative-replay');
const { createAuthoritativeEvidenceEnvelope } = require('../src/core/authoritative-evidence');

function validInput() {
  return {
    schema_version: '1',
    evidence_class: AUTHORITY_CLASSES.AUTHORITATIVE,
    chain_id: 4663,
    source: 'rpc:step-444-test',
    evidence_id: 'ev:step444:001',
    request: { method: 'eth_getLogs', params: [] },
    response_payload: { jsonrpc: '2.0', id: 1, result: [] },
    observation: { block_number: 100 },
    capture: { captured_at: '2026-01-01T00:00:00Z' },
    events: [{
      event_type: 'POOL_CREATED', evidence_id: 'ei:001', chain_id: 4663,
      pool_id: '0xpool', block_number: 100, transaction_index: 0, log_index: 0,
    }],
  };
}

test('envelope rejects null and array capture inputs', () => {
  assert.throws(() => createAuthoritativeEvidenceEnvelope(null), /capture input/);
  assert.throws(() => createAuthoritativeEvidenceEnvelope([]), /capture input/);
});

test('envelope rejects invalid schema, authority class, and chain id', () => {
  const schema = validInput(); schema.schema_version = '2';
  assert.throws(() => createAuthoritativeEvidenceEnvelope(schema), /schema version/);
  const authority = validInput(); authority.evidence_class = AUTHORITY_CLASSES.SYNTHETIC;
  assert.throws(() => createAuthoritativeEvidenceEnvelope(authority), /must be AUTHORITATIVE/);
  const chain = validInput(); chain.chain_id = -1;
  assert.throws(() => createAuthoritativeEvidenceEnvelope(chain), /valid chain_id/);
});

test('envelope rejects malformed request, observation, capture, and event metadata', () => {
  const request = validInput(); request.request = [];
  assert.throws(() => createAuthoritativeEvidenceEnvelope(request), /request/);
  const observation = validInput(); observation.observation.block_number = -1;
  assert.throws(() => createAuthoritativeEvidenceEnvelope(observation), /block_number/);
  const capture = validInput(); capture.capture = [];
  assert.throws(() => createAuthoritativeEvidenceEnvelope(capture), /capture/);
  const events = validInput(); events.events = [];
  assert.throws(() => createAuthoritativeEvidenceEnvelope(events), /events/);
});
