'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDomainMeasurement,
} = require('../src/core/domain-measurement');

function input(overrides = {}) {
  return {
    observation_type: 'TRANSACTION_COST',
    chain_id: 4663,
    entity_ref: 'tx:0xabc',
    evidence_refs: ['e2', 'e1'],
    provenance_ref: 'prov:1',
    event_time: '2026-09-26T00:00:00.000Z',
    observation_time: '2026-09-26T00:01:00.000Z',
    processing_time: '2026-09-26T00:02:00.000Z',
    validation_status: 'OBSERVED',
    uncertainty: 'LOW',
    admission: {
      evidence_refs: ['e1', 'e2'],
      provenance_refs: ['prov:1'],
    },
    payload: {
      measurement_kind: 'TRANSACTION_COST',
      transaction_ref: 'tx1',
      block_ref: 'b1',
      gas_used: '21000',
      effective_gas_price: '1000000000',
      fee_asset: 'ETH',
      measurement_version: '1',
      comparability_status: 'UNKNOWN',
    },
    ...overrides,
  };
}

test('test boundary preserves caller input and produces immutable output', () => {
  const original = input();
  const snapshot = structuredClone(original);
  const observation = createDomainMeasurement(original);

  assert.deepEqual(original, snapshot);
  assert.equal(Object.isFrozen(observation), true);
  assert.equal(Object.isFrozen(observation.payload), true);
  assert.deepEqual(observation.evidence_refs, ['e1', 'e2']);
  assert.equal(Object.hasOwn(observation, 'actor_ref'), false);
});

test('test boundary fails closed for unresolved evidence and provenance', () => {
  assert.throws(
    () => createDomainMeasurement(input({
      evidence_refs: ['e1', 'missing'],
    })),
    /evidence_refs_UNRESOLVED/
  );

  assert.throws(
    () => createDomainMeasurement(input({
      provenance_ref: 'missing-provenance',
    })),
    /provenance_ref_UNRESOLVED/
  );

  assert.throws(
    () => createDomainMeasurement(input({
      payload: {
        ...input().payload,
        conversion_ref: 'missing-conversion',
        conversion_time: '2026-09-26T00:00:30.000Z',
        conversion_source: 'preserved-source',
      },
    })),
    /payload_evidence_ref_UNRESOLVED/
  );
});

test('test boundary preserves explicit validation states without normalization', () => {
  for (const validation_status of ['CLAIMED', 'UNKNOWN', 'INCONCLUSIVE', 'UNVERIFIED', 'CONFLICTING']) {
    const observation = createDomainMeasurement(input({ validation_status }));
    assert.equal(observation.validation_status, validation_status);
  }
});

test('test boundary rejects temporal leakage', () => {
  assert.throws(
    () => createDomainMeasurement(input({
      observation_time: '2026-09-26T00:03:00.000Z',
      processing_time: '2026-09-26T00:02:00.000Z',
    })),
    /observation_time cannot be later than processing_time/
  );

  assert.throws(
    () => createDomainMeasurement(input({
      event_time: '2026-09-26T00:03:00.000Z',
      observation_time: '2026-09-26T00:01:00.000Z',
    })),
    /event_time cannot be later than observation_time/
  );
});
