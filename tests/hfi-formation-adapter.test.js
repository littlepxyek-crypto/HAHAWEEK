'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  toFormationEvidence,
  detectPoolBootstrapFromDecodedEvents,
} = require('../src/core/hfi-formation-adapter');

function base(eventType, identity, blockNumber, logIndex, eventTime) {
  return {
    eventType,
    identity,
    chainId: 4663,
    poolId: '0xpool',
    blockNumber,
    transactionIndex: 0,
    logIndex,
    event_time: eventTime,
  };
}

test('maps Initialize/ModifyLiquidity/Swap to Pool Bootstrap vocabulary', () => {
  const result = detectPoolBootstrapFromDecodedEvents([
    base('POOL_INITIALIZED', 'ei:init', 100, 0, '2026-01-01T00:00:00.000Z'),
    {
      ...base('LIQUIDITY_MODIFIED', 'ei:liq', 101, 0, '2026-01-01T00:01:00.000Z'),
      liquidityDelta: '1000',
    },
    base('SWAP', 'ei:swap', 102, 0, '2026-01-01T00:02:00.000Z'),
  ]);

  assert.equal(result.state, 'VALID');
  assert.deepEqual(result.formation.evidence_ids, ['ei:init', 'ei:liq', 'ei:swap']);
});

test('negative liquidity modification cannot satisfy Liquidity Added', () => {
  assert.throws(
    () => toFormationEvidence({
      ...base('LIQUIDITY_MODIFIED', 'ei:remove', 101, 0, '2026-01-01T00:01:00.000Z'),
      liquidityDelta: '-1',
    }),
    /LIQUIDITY_ADDITION_NOT_POSITIVE/
  );
});

test('event time is mandatory for formation semantics', () => {
  assert.throws(
    () => toFormationEvidence({
      ...base('SWAP', 'ei:swap', 102, 0, undefined),
    }),
    /EVENT_TIME_REQUIRED/
  );
});

test('unsupported decoded event cannot be silently normalized', () => {
  assert.throws(
    () => toFormationEvidence({
      ...base('UNKNOWN_EVENT', 'ei:unknown', 102, 0, '2026-01-01T00:02:00.000Z'),
    }),
    /UNSUPPORTED_FORMATION_EVENT/
  );
});
