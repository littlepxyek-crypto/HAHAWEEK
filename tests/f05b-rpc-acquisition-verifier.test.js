'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canonicalInput,
  acquisitionIdentity,
  verifyAcquisition,
} = require('../src/reference/v4/rpc-acquisition');

const BASE = {
  protocol: 'HAHAWEEK-V4-RPC-ACQUISITION-V0.1',
  version: '0.1',
  chain_id: '4663',
  rpc_source: 'robinhood-mainnet',
  method: 'eth_getLogs',
  request_digest: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  response_digest: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  from_block: '100',
  to_block: '109',
  observed_at: '2026-09-21T00:00:00.000Z',
  completeness: 'COMPLETE',
};

test('F-05B golden acquisition is deterministic', () => {
  assert.equal(acquisitionIdentity(BASE), acquisitionIdentity({ ...BASE }));
  assert.equal(verifyAcquisition(BASE).valid, true);
});

test('F-05B canonical input is key-order deterministic', () => {
  const reordered = {
    completeness: BASE.completeness,
    to_block: BASE.to_block,
    from_block: BASE.from_block,
    observed_at: BASE.observed_at,
    response_digest: BASE.response_digest,
    request_digest: BASE.request_digest,
    method: BASE.method,
    rpc_source: BASE.rpc_source,
    chain_id: BASE.chain_id,
    version: BASE.version,
    protocol: BASE.protocol,
  };
  assert.equal(canonicalInput(BASE), canonicalInput(reordered));
});

test('F-05B accepts every explicit completeness state', () => {
  for (const completeness of ['COMPLETE', 'PARTIAL', 'FAILED', 'UNKNOWN']) {
    assert.doesNotThrow(() => verifyAcquisition({ ...BASE, completeness }));
  }
});

test('F-05B rejects invalid block range', () => {
  assert.throws(
    () => verifyAcquisition({ ...BASE, from_block: '110', to_block: '109' }),
    /BLOCK_RANGE_INVALID/
  );
});

test('F-05B rejects malformed digest', () => {
  assert.throws(
    () => verifyAcquisition({ ...BASE, request_digest: 'not-a-digest' }),
    /REQUEST_DIGEST_INVALID/
  );
});

test('F-05B rejects unknown completeness', () => {
  assert.throws(
    () => verifyAcquisition({ ...BASE, completeness: 'COMPLETE_WITH_GAPS' }),
    /COMPLETENESS_INVALID/
  );
});

test('F-05B rejects unknown fields', () => {
  assert.throws(
    () => verifyAcquisition({ ...BASE, secret: 'must-not-enter-provenance' }),
    /ACQUISITION_KEYS_INVALID/
  );
});

test('F-05B identity changes when acquisition evidence changes', () => {
  assert.notEqual(
    acquisitionIdentity(BASE),
    acquisitionIdentity({ ...BASE, response_digest: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' })
  );
});

test('F-05B verifier does not mutate input', () => {
  const input = { ...BASE };
  const before = JSON.stringify(input);
  verifyAcquisition(input);
  assert.equal(JSON.stringify(input), before);
});
