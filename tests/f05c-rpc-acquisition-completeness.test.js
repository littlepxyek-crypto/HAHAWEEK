'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
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

test('F-05C partial acquisition remains non-complete', () => {
  const result = verifyAcquisition({ ...BASE, completeness: 'PARTIAL' });
  assert.equal(result.valid, true);
  assert.equal(result.canonical.includes('"completeness":"PARTIAL"'), true);
});

test('F-05C failed acquisition remains non-complete', () => {
  const result = verifyAcquisition({ ...BASE, completeness: 'FAILED' });
  assert.equal(result.canonical.includes('"completeness":"FAILED"'), true);
});

test('F-05C unknown acquisition remains explicit', () => {
  const result = verifyAcquisition({ ...BASE, completeness: 'UNKNOWN' });
  assert.equal(result.canonical.includes('"completeness":"UNKNOWN"'), true);
});

test('F-05C chain mismatch cannot be hidden by changing completeness', () => {
  assert.notEqual(
    verifyAcquisition({ ...BASE, chain_id: '4663' }).acquisition_identity,
    verifyAcquisition({ ...BASE, chain_id: '9999' }).acquisition_identity
  );
});

test('F-05C block range mutation changes acquisition identity', () => {
  assert.notEqual(
    verifyAcquisition(BASE).acquisition_identity,
    verifyAcquisition({ ...BASE, to_block: '110' }).acquisition_identity
  );
});

test('F-05C source mutation changes acquisition identity', () => {
  assert.notEqual(
    verifyAcquisition(BASE).acquisition_identity,
    verifyAcquisition({ ...BASE, rpc_source: 'different-source' }).acquisition_identity
  );
});

test('F-05C observed acquisition time is bound to identity', () => {
  assert.notEqual(
    verifyAcquisition(BASE).acquisition_identity,
    verifyAcquisition({ ...BASE, observed_at: '2026-09-21T00:01:00.000Z' }).acquisition_identity
  );
});
