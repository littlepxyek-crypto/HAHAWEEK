'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { jcs, canonicalHash } = require('../src/reference/v4/canonical-hash');

const TRANSITION_IDENTITY = {
  event_id: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  transition_sequence: '0',
  from_state: 'OBSERVED',
  to_state: 'CANONICAL',
  reason_code: 'INITIAL_CANONICAL',
};
const EXPECTED_CANONICAL_UTF8_HEX = '7b226576656e745f6964223a22307861616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161222c2266726f6d5f7374617465223a224f42534552564544222c22726561736f6e5f636f6465223a22494e495449414c5f43414e4f4e4943414c222c22746f5f7374617465223a2243414e4f4e4943414c222c227472616e736974696f6e5f73657175656e6365223a2230227d';
const EXPECTED_HASH = '767b8bf9b7a491d0e072478122920711cadee818dbfe14850143522e1f7ae389';
test('F-01 transition identity vector matches canonical bytes', () => { const actual = canonicalHash('HAHAWEEK-EVIDENCE-V4-TRANSITION', TRANSITION_IDENTITY); assert.equal(Buffer.from(actual.canonical, 'utf8').toString('hex'), EXPECTED_CANONICAL_UTF8_HEX); });
test('F-01 transition identity vector matches domain-separated hash', () => { const actual = canonicalHash('HAHAWEEK-EVIDENCE-V4-TRANSITION', TRANSITION_IDENTITY); assert.equal(actual.sha256, EXPECTED_HASH); });
test('F-01 transition identity key order is irrelevant to canonical bytes', () => { const reordered = Object.fromEntries(Object.entries(TRANSITION_IDENTITY).reverse()); assert.equal(jcs(reordered), jcs(TRANSITION_IDENTITY)); });

const REORG_OBSERVATION_IDENTITY = {
  chain_id: '4663',
  block_number: '123',
  previous_block_hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  replacement_block_hash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  detected_by_acquisition_id: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
};
const EXPECTED_REORG_CANONICAL_UTF8_HEX = '7b22626c6f636b5f6e756d626572223a22313233222c22636861696e5f6964223a2234363633222c2264657465637465645f62795f6163717569736974696f6e5f6964223a22307863636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363222c2270726576696f75735f626c6f636b5f68617368223a22307861616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161222c227265706c6163656d656e745f626c6f636b5f68617368223a22307862626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262227d';
const EXPECTED_REORG_HASH = 'a6cac6b3c513dc9f184b74249a61d5cff130c0a8838de8f4344cc59a7f549201';

test('F-01 reorg observation golden vector', () => {
  const actual = canonicalHash('HAHAWEEK-EVIDENCE-V4-TRANSITION', REORG_OBSERVATION_IDENTITY);
  assert.equal(Buffer.from(actual.canonical, 'utf8').toString('hex'), EXPECTED_REORG_CANONICAL_UTF8_HEX);
  assert.equal(actual.sha256, EXPECTED_REORG_HASH);
});


const ACQUISITION_IDENTITY = {
  chain_id: '4663',
  provider_id: 'rpc-primary',
  request_sequence: '0',
  pagination_index: '0',
  requested_from_block: '123',
  requested_to_block: '132',
  filter_hash: '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
};

test('F-01 acquisition identity golden vector is canonical and domain-separated', () => {
  const actual = canonicalHash('HAHAWEEK-EVIDENCE-V4-ACQUISITION', ACQUISITION_IDENTITY);
  assert.equal(Buffer.from(actual.canonical, 'utf8').toString('hex'), '7b22636861696e5f6964223a2234363633222c2266696c7465725f68617368223a22307864646464646464646464646464646464646464646464646464646464646464646464646464646464646464646464646464646464646464646464646464646464222c22706167696e6174696f6e5f696e646578223a2230222c2270726f76696465725f6964223a227270632d7072696d617279222c22726571756573745f73657175656e6365223a2230222c227265717565737465645f66726f6d5f626c6f636b223a22313233222c227265717565737465645f746f5f626c6f636b223a22313332227d');
  assert.equal(actual.sha256, '74b075d427f5af63d7b2db60e5cf24db200a1cde36db68a2db9494742982aaec');
});

const SEGMENT_IDENTITY = {
  protocol_version: '4',
  segment_kind: 'EVENT',
  generation: '0',
  segment_sequence: '0',
};

const SEGMENT_EVENT_RECORD = {
  record_type: 'EVENT',
  protocol_version: '4',
  sequence_number: '1',
  event_id: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  payload_hash: '0xdfa79e6f2a7097cebd92b06b874c42b6ee8c4f26c6cc576111240ca09926013c',
  payload: {},
};

const SEGMENT_BODY_SHA256 = 'b3fe902edba2713d0d3104f6a596796028775ac08aecce4532923d531d9d6c3c';
const SEGMENT_HASH = '4d6a06606a080dfebf92f469b1b3eedec3b045b7ad0fd36c19603829620802bf';

test('F-01 segment identity/body/seal golden vector is canonical', () => {
  const segmentId = canonicalHash('HAHAWEEK-EVIDENCE-V4-SEGMENT', SEGMENT_IDENTITY);
  assert.equal(segmentId.sha256, '98a4e799919cbdf02c4700121471beb8d91e4c3d57b7b2fc2b2f9cb49becbe3f');

  const bodyBytes = Buffer.from(jcs(SEGMENT_EVENT_RECORD) + '\n', 'utf8');
  const bodyPreimage = Buffer.concat([
    Buffer.from('HAHAWEEK-EVIDENCE-V4-SEGMENT', 'utf8'),
    Buffer.from([0]),
    bodyBytes,
  ]);
  const bodyHash = require('node:crypto').createHash('sha256').update(bodyPreimage).digest('hex');
  assert.equal(bodyHash, SEGMENT_BODY_SHA256);

  const sealIdentity = {
    segment_id: '0x' + segmentId.sha256,
    generation: '0',
    segment_sequence: '0',
    segment_kind: 'EVENT',
    first_body_sequence: '1',
    last_body_sequence: '1',
    record_count: '1',
    body_sha256: '0x' + bodyHash,
  };
  const sealHash = canonicalHash('HAHAWEEK-EVIDENCE-V4-SEGMENT', sealIdentity);
  assert.equal(sealHash.sha256, SEGMENT_HASH);
});

const MANIFEST_IDENTITY = {
  chain_id: '4663',
  manifest_generation: '0',
  previous_manifest_hash: null,
};

test('F-01 manifest identity golden vector is canonical', () => {
  const manifestId = canonicalHash('HAHAWEEK-EVIDENCE-V4-MANIFEST', MANIFEST_IDENTITY);
  assert.equal(manifestId.sha256, 'cf317d57f76fdb52cba8f4631ed2196c3f21f3e9b7ac2bc132d673ebf4ac2973');
});

const CHECKPOINT_IDENTITY = {
  chain_id: '4663',
  manifest_generation: '0',
  manifest_hash: '0x' + '1'.repeat(64),
  evidence_to_block: '64986566',
  last_segment_sequence: '0',
  last_record_sequence: '229',
};

test('F-01 checkpoint identity golden vector is canonical', () => {
  const checkpointId = canonicalHash('HAHAWEEK-EVIDENCE-V4-CHECKPOINT', CHECKPOINT_IDENTITY);
  assert.equal(checkpointId.sha256, '466357fe0a6d69ff83fc290d247c59fb6e3fa4f32d5e0daa1fff4c176b195e87');
});

const CURSOR_IDENTITY = {
  chain_id: '4663',
  manifest_generation: '0',
  checkpoint_id: '0x' + '2'.repeat(64),
  cursor_generation: '0',
  next_block: '64986567',
  last_record_sequence: '229',
};

test('F-01 cursor identity golden vector is canonical', () => {
  const cursorId = canonicalHash('HAHAWEEK-EVIDENCE-V4-CURSOR', CURSOR_IDENTITY);
  assert.equal(cursorId.sha256, 'a34b8cdf11a16fd3a9df8c565df496a2af50bdf3f15db5f088a93b305c0209da');
});

const LEASE_IDENTITY = {
  chain_id: '4663',
  lease_generation: '0',
  owner_id: '3'.repeat(64),
  process_start_nonce: '4'.repeat(64),
};

test('F-01 lease identity golden vector is canonical', () => {
  const leaseId = canonicalHash('HAHAWEEK-EVIDENCE-V4-LEASE', LEASE_IDENTITY);
  assert.equal(leaseId.sha256, '7eb8894c1f61444a66bf57ad96b88427a4280bb54a4859c1408370a48bacd53f');
});

const MIGRATION_IDENTITY = {
  source_file_sha256: '5'.repeat(64),
  source_size_bytes: '1024',
  source_record_count: '10',
  source_path: 'data/raw-events.jsonl',
  target_chain_id: '4663',
  protocol_version: '4',
};

test('F-01 migration identity golden vector is canonical', () => {
  const migrationId = canonicalHash('HAHAWEEK-EVIDENCE-V4-MIGRATION', MIGRATION_IDENTITY);
  assert.equal(migrationId.sha256, 'ba740e4535441843ba4e12e0eecb139b3f006dd310524fa3748d54d11b716715');
});

const MIGRATION_MANIFEST = {
  record_type: 'MIGRATION_MANIFEST',
  protocol_version: '4',
  migration_id: '0x' + '6'.repeat(64),
  source_file_sha256: '0x' + '5'.repeat(64),
  source_size_bytes: '1024',
  source_record_count: '10',
  verified_count: '7',
  unverified_count: '2',
  quarantined_count: '1',
  verified_output_hash: '0x' + '7'.repeat(64),
  unverified_output_hash: '0x' + '8'.repeat(64),
  quarantine_output_hash: '0x' + '9'.repeat(64),
  created_at: '2026-09-19T00:00:00.000Z',
};

test('F-01 migration manifest golden vector is canonical', () => {
  const manifestHash = canonicalHash('HAHAWEEK-EVIDENCE-V4-MIGRATION', MIGRATION_MANIFEST);
  assert.equal(manifestHash.sha256, 'MIGRATION_MANIFEST_HASH_PENDING');
});
