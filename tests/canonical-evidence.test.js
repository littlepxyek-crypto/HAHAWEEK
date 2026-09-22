'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createCanonicalEvidence,
} = require('../src/core/canonical-evidence');

function sampleRaw() {
  return {
    event_id: '4663:123:0x' + 'b'.repeat(64) + ':7',
    chain_id: 4663,
    block_number: 123,
    block_hash: '0x' + 'a'.repeat(64),
    transaction_hash: '0x' + 'b'.repeat(64),
    transaction_index: 4,
    log_index: 7,
    address: '0x' + 'c'.repeat(40),
    topics: ['0x' + 'd'.repeat(64)],
    data: '0xdeadbeef',
    captured_at: '2026-01-01T00:00:00.000Z',
  };
}

test('canonical evidence is traceable to raw evidence', () => {
  const raw = sampleRaw();
  const evidence = createCanonicalEvidence(raw);

  assert.equal(evidence.evidence_id, `ce:${raw.event_id}`);
  assert.equal(evidence.evidence_type, 'RAW_LOG');
  assert.equal(evidence.raw_reference.event_id, raw.event_id);
  assert.equal(evidence.provenance_reference.raw_event_id, raw.event_id);
  assert.equal(evidence.location.block_number, raw.block_number);
  assert.equal(evidence.location.block_hash, raw.block_hash);
  assert.equal(evidence.location.transaction_index, 4);
  assert.equal(evidence.location.log_index, 7);
  assert.equal(evidence.interpretation_status, 'UNINTERPRETED');
});

test('canonicalization does not mutate raw evidence', () => {
  const raw = sampleRaw();
  const before = JSON.parse(JSON.stringify(raw));

  createCanonicalEvidence(raw);

  assert.deepEqual(raw, before);
});

test('canonical evidence normalizes representation explicitly', () => {
  const raw = sampleRaw();
  raw.transaction_hash = raw.transaction_hash.toUpperCase();
  raw.address = raw.address.toUpperCase();
  raw.topics[0] = raw.topics[0].toUpperCase();

  const evidence = createCanonicalEvidence(raw);

  assert.equal(evidence.location.transaction_hash, raw.transaction_hash.toLowerCase());
  assert.equal(evidence.contract_address, raw.address.toLowerCase());
  assert.equal(evidence.topics[0], raw.topics[0].toLowerCase());
});

test('missing block hash remains explicit unknown/null', () => {
  const raw = sampleRaw();
  delete raw.block_hash;

  const evidence = createCanonicalEvidence(raw);

  assert.equal(evidence.location.block_hash, null);
});

test('interpretation status is versioned and constrained', () => {
  const raw = sampleRaw();

  assert.equal(
    createCanonicalEvidence(raw, {
      interpretation_status: 'UNKNOWN',
    }).interpretation_status,
    'UNKNOWN'
  );

  assert.throws(
    () => createCanonicalEvidence(raw, {
      interpretation_status: 'DECODED',
    }),
    /INVALID_INTERPRETATION_STATUS/
  );
});

test('invalid raw evidence is rejected', () => {
  const raw = sampleRaw();
  raw.log_index = -1;

  assert.throws(
    () => createCanonicalEvidence(raw),
    /INVALID_LOG_INDEX/
  );
});
