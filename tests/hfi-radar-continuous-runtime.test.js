'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  applyEvents,
  removeReorgedState,
} = require('../scripts/hfi-radar-continuous-runtime');

function event(type, id, block, pool='0x' + '11'.repeat(32)) {
  return {
    event_type: type,
    evidence_id: id,
    chain_id: 4663,
    pool_id: pool,
    block_number: block,
    transaction_index: 0,
    log_index: 0,
    event_time: new Date(block * 1000).toISOString(),
  };
}

test('continuous radar emits a candidate only after canonical create + liquidity evidence', () => {
  const state = { pools: {}, emitted: {}, cycles_completed: 0 };
  assert.deepEqual(applyEvents(state, [
    { event: event('POOL_CREATED', 'ei:create', 100), pool_id: '0x' + '11'.repeat(32) },
  ]), []);
  const emitted = applyEvents(state, [
    { event: event('LIQUIDITY_ADDED', 'ei:liquidity', 101), pool_id: '0x' + '11'.repeat(32) },
  ]);
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].radar_kind, 'CANDIDATE');
  assert.deepEqual(emitted[0].evidence_ids.sort(), ['ei:create', 'ei:liquidity']);
});

test('continuous radar is idempotent for duplicate evidence', () => {
  const state = { pools: {}, emitted: {}, cycles_completed: 0 };
  const items = [
    { event: event('POOL_CREATED', 'ei:create', 100), pool_id: '0x' + '11'.repeat(32) },
    { event: event('LIQUIDITY_ADDED', 'ei:liquidity', 101), pool_id: '0x' + '11'.repeat(32) },
  ];
  assert.equal(applyEvents(state, items).length, 1);
  assert.equal(applyEvents(state, items).length, 0);
});

test('reorg replacement removes derived radar evidence only in replaced block range', () => {
  const state = {
    pools: {
      ['0x' + '11'.repeat(32)]: {
        events: [
          event('POOL_CREATED', 'ei:create', 100),
          event('LIQUIDITY_ADDED', 'ei:liquidity-old', 101),
          event('LIQUIDITY_ADDED', 'ei:liquidity-later', 110),
        ],
      },
    },
    emitted: {},
    cycles_completed: 1,
  };
  removeReorgedState(state, 101, 105);
  assert.deepEqual(state.pools['0x' + '11'.repeat(32)].events.map(x => x.evidence_id), [
    'ei:create',
    'ei:liquidity-later',
  ]);
});
