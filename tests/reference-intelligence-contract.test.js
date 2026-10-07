'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ReferenceGateway, ControlledFixtureProvider, createReferenceObservation, transitionReferenceObservation } = require('../src/reference');

function request(overrides = {}) {
  return Object.assign({
    providerId: 'fixture', requestId: 'req-1', acquisitionId: 'acq-1',
    subject: '0xsubject', asOfTime: '2026-10-07T00:00:00.000Z',
    request: { kind: 'identity-label', version: 1 },
  }, overrides);
}

test('controlled provider returns provenance-bearing observation', async () => {
  const gateway = new ReferenceGateway({ providers: { fixture: new ControlledFixtureProvider() } });
  const observation = await gateway.observe(request());
  assert.equal(observation.status, 'OBSERVED');
  assert.equal(observation.provider_id, 'fixture');
  assert.equal(observation.as_of_time, request().asOfTime);
  assert.equal(observation.provenance.source_lineage_id, 'fixture-lineage');
  assert.match(observation.payload_digest, /^[a-f0-9]{64}$/);
});

test('provider-specific payload is preserved', async () => {
  const payload = { vendor_field: 'keep-me', nested: { unknown_field: 42 } };
  const gateway = new ReferenceGateway({ providers: { fixture: new ControlledFixtureProvider({ payload }) } });
  const observation = await gateway.observe(request());
  assert.equal(observation.provider_payload.vendor_field, 'keep-me');
  assert.equal(observation.provider_payload.nested.unknown_field, 42);
});

test('unknown lineage is I0, never silently independent', () => {
  const observation = createReferenceObservation({
    provider_id:'p', provider_type:'TEST', request_id:'r', acquisition_id:'a', subject:'s',
    observation_time:'2026-10-07T00:00:00.000Z', retrieval_time:'2026-10-07T00:00:01.000Z',
    as_of_time:'2026-10-07T00:00:00.000Z', source_reference:'test://source',
    provenance:{ source_id:'s1' }, status:'OBSERVED', provider_payload:{x:1},
  });
  assert.equal(observation.independence_classification, 'I0_UNKNOWN');
});

test('provider timeout fails closed and is not negative evidence', async () => {
  const gateway = new ReferenceGateway({
    providers: { fixture: new ControlledFixtureProvider({ delayMs: 50 }) },
    limits: { timeoutMs: 5 },
  });
  const observation = await gateway.observe(request());
  assert.equal(observation.status, 'FAILED');
  assert.equal(observation.completeness_status, 'UNKNOWN');
  assert.equal(observation.independence_classification, 'I0_UNKNOWN');
});

test('request budget is bounded', async () => {
  const gateway = new ReferenceGateway({
    providers: { fixture: new ControlledFixtureProvider() },
    limits: { requestBudget: 1 }, cache: false,
  });
  assert.equal((await gateway.observe(request({requestId:'r1'}))).status, 'OBSERVED');
  const second = await gateway.observe(request({requestId:'r2'}));
  assert.equal(second.status, 'FAILED');
  assert.equal(second.error_status, 'REQUEST_BUDGET_EXHAUSTED');
});

test('concurrency limit fails closed', async () => {
  const gateway = new ReferenceGateway({
    providers: { fixture: new ControlledFixtureProvider({ delayMs: 25 }) },
    limits: { concurrencyLimit: 1, timeoutMs: 100 },
  });
  const first = gateway.observe(request({requestId:'r1'}));
  const second = await gateway.observe(request({requestId:'r2'}));
  assert.equal(second.status, 'FAILED');
  assert.equal(second.error_status, 'CONCURRENCY_LIMIT');
  assert.equal((await first).status, 'OBSERVED');
});

test('identity label cannot self-promote to validated', async () => {
  const gateway = new ReferenceGateway({
    providers: { fixture: new ControlledFixtureProvider({ payload: { identity_label:'Example Entity', confidence:0.99 } }) },
  });
  const observation = await gateway.observe(request());
  assert.throws(() => transitionReferenceObservation(observation, 'VALIDATED'), /ILLEGAL_TRANSITION/);
  assert.equal(observation.status, 'OBSERVED');
});

test('validated state requires explicit analytical transitions', async () => {
  const gateway = new ReferenceGateway({ providers: { fixture: new ControlledFixtureProvider() } });
  const observed = await gateway.observe(request());
  const relevant = transitionReferenceObservation(observed, 'ANALYTICALLY_RELEVANT');
  const validated = transitionReferenceObservation(relevant, 'VALIDATED');
  assert.equal(validated.status, 'VALIDATED');
  assert.equal(observed.status, 'OBSERVED');
});

test('provider failure exposes no authority or database handles', async () => {
  const gateway = new ReferenceGateway({
    providers: { fixture: new ControlledFixtureProvider({ failWith:'RATE_LIMIT' }) },
  });
  const observation = await gateway.observe(request());
  assert.equal(observation.status, 'FAILED');
  assert.equal(typeof gateway.cursor, 'undefined');
  assert.equal(typeof gateway.checkpoint, 'undefined');
  assert.equal(typeof gateway.manifest, 'undefined');
  assert.equal(typeof gateway.database, 'undefined');
});
