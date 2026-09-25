'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  IDENTITY_DOMAIN,
  createIdentityPayload,
  createSurveillanceObservation,
} = require('../src/core/surveillance-observation');

function baseInput(overrides = {}) {
  return {
    observation_type: 'LIQUIDITY_ACTIVITY',
    chain_id: 4663,
    entity_ref: '0xpool',
    evidence_refs: ['e2', 'e1'],
    provenance_ref: 'prov-1',
    event_time: '2026-09-26T00:00:00.000Z',
    observation_time: '2026-09-26T00:01:00.000Z',
    processing_time: '2026-09-26T00:02:00.000Z',
    rule_version: '1',
    validation_status: 'OBSERVED',
    uncertainty: 'LOW',
    payload: {
      liquidity_delta: '1000',
    },
    ...overrides,
  };
}

test('surveillance observation is deterministic and canonicalizes evidence references', () => {
  const first = createSurveillanceObservation(baseInput());
  const second = createSurveillanceObservation(baseInput({
    processing_time: '2026-09-26T01:02:00.000Z',
  }));

  assert.equal(first.observation_id, second.observation_id);
  assert.deepEqual(first.evidence_refs, ['e1', 'e2']);
  assert.equal(first.observation_id, 'so:v1:3efcafcc28fc704866f01b896c4a4bbfc63309fcb849178e17bfadd64dfb2d6f');
});

test('processing time is preserved but excluded from identity', () => {
  const a = createSurveillanceObservation(baseInput());
  const b = createSurveillanceObservation(baseInput({
    processing_time: '2026-09-26T02:02:00.000Z',
  }));

  assert.equal(a.processing_time, '2026-09-26T00:02:00.000Z');
  assert.equal(b.processing_time, '2026-09-26T02:02:00.000Z');
  assert.equal(a.observation_id, b.observation_id);
});

test('duplicate evidence references fail closed', () => {
  assert.throws(
    () => createSurveillanceObservation(baseInput({ evidence_refs: ['e1', 'e1'] })),
    /evidence_refs must not contain duplicates/
  );
});

test('missing provenance fails closed', () => {
  assert.throws(
    () => createSurveillanceObservation(baseInput({ provenance_ref: '' })),
    /provenance_ref must be a non-empty string/
  );
});

test('unsupported observation type fails closed', () => {
  assert.throws(
    () => createSurveillanceObservation(baseInput({ observation_type: 'SMART_MONEY' })),
    /unsupported observation_type/
  );
});

test('unsupported validation status fails closed', () => {
  assert.throws(
    () => createSurveillanceObservation(baseInput({ validation_status: 'FALSE' })),
    /unsupported validation_status/
  );
});

test('temporal leakage fails closed', () => {
  assert.throws(
    () => createSurveillanceObservation(baseInput({
      event_time: '2026-09-26T00:02:00.000Z',
      observation_time: '2026-09-26T00:01:00.000Z',
    })),
    /event_time cannot be later than observation_time/
  );

  assert.throws(
    () => createSurveillanceObservation(baseInput({
      observation_time: '2026-09-26T00:03:00.000Z',
      processing_time: '2026-09-26T00:02:00.000Z',
    })),
    /observation_time cannot be later than processing_time/
  );
});

test('unknown, inconclusive, and unverified are preserved as first-class states', () => {
  for (const status of ['UNKNOWN', 'INCONCLUSIVE', 'UNVERIFIED']) {
    const observation = createSurveillanceObservation(baseInput({
      validation_status: status,
      uncertainty: 'INSUFFICIENT_EVIDENCE',
    }));
    assert.equal(observation.validation_status, status);
    assert.equal(observation.uncertainty, 'INSUFFICIENT_EVIDENCE');
  }
});

test('input and output payloads are isolated and output is deeply frozen', () => {
  const input = baseInput();
  const observation = createSurveillanceObservation(input);

  input.payload.liquidity_delta = '9999';

  assert.equal(observation.payload.liquidity_delta, '1000');
  assert.ok(Object.isFrozen(observation));
  assert.ok(Object.isFrozen(observation.payload));
});

test('constructor does not mutate the input object', () => {
  const input = baseInput();
  const before = structuredClone(input);

  createSurveillanceObservation(input);

  assert.deepEqual(input, before);
});

test('identity payload excludes processing time and uses canonical evidence references', () => {
  const input = baseInput();
  const identity = createIdentityPayload(input, ['e1', 'e2']);

  assert.equal(identity.schema_version, '1');
  assert.equal(identity.chain_id, '4663');
  assert.deepEqual(identity.evidence_refs, ['e1', 'e2']);
  assert.equal(identity.processing_time, undefined);
  assert.equal(IDENTITY_DOMAIN, 'HAHAWEEK-SURVEILLANCE-OBSERVATION-V1');
});
