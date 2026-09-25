'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalHash } = require('../src/reference/v4/canonical-hash');

test('F-01 artifact identity vectors reproduce independently', () => {
  const event = {
    chain_id: '4663',
    block_hash: '0x' + '1'.repeat(64),
    block_number: '64986596',
    transaction_hash: '0x' + '2'.repeat(64),
    transaction_index: '0',
    log_index: '0',
    contract_address: '0x' + '3'.repeat(40),
    topic0: '0x' + '4'.repeat(64),
  };
  const eventId = canonicalHash('HAHAWEEK-EVIDENCE-V4-PAYLOAD', event).sha256;
  assert.equal(eventId, '706b133f85b20a6bb80f39b4f1b15abef43918c641b8a9e547bb844b0d6562d1');

  const transition = {
    event_id: eventId,
    transition_sequence: '0',
    from_state: 'OBSERVED',
    to_state: 'CANONICAL',
    reason_code: 'INITIAL_CANONICAL_OBSERVATION',
  };
  assert.equal(canonicalHash('HAHAWEEK-EVIDENCE-V4-TRANSITION', transition).sha256, '7acdf853302fc304f1a4c1f987fcdb0b9bb7fabfb6be6b5d6ce6673ec9a557a0');

  const reorg = {
    chain_id: '4663',
    block_number: '64986596',
    previous_block_hash: '0x' + '1'.repeat(64),
    replacement_block_hash: '0x' + '5'.repeat(64),
    detected_by_acquisition_id: '6'.repeat(64),
  };
  assert.equal(canonicalHash('HAHAWEEK-EVIDENCE-V4-TRANSITION', reorg).sha256, '210d4cdde5ddf8f0a598b3457c4097efeae4e3abd7975582852766e2864738d9');

  const acquisition = {
    chain_id: '4663',
    filter_hash: '0x' + '7'.repeat(64),
    pagination_index: '0',
    provider_id: 'robinhood-mainnet-primary',
    request_sequence: '0',
    requested_from_block: '64986557',
    requested_to_block: '64986566',
  };
  assert.equal(canonicalHash('HAHAWEEK-EVIDENCE-V4-ACQUISITION', acquisition).sha256, '6efb8f5087b0681c33c72f5f38eedb6ca8fba97478b85aef300adaf2d824f7c9');

  const response = {
    chain_id: '4663',
    filter_hash: '0x' + '7'.repeat(64),
    logs: [],
    requested_from_block: '64986557',
    requested_to_block: '64986566',
    status: 'SUCCESS',
  };
  assert.equal(canonicalHash('HAHAWEEK-EVIDENCE-V4-ACQUISITION', response).sha256, '29dbbd1485e675f18c177940d1708067ac70fb765a87321032e8f1795d98935c');
});
