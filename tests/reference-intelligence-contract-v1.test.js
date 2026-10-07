'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createReferenceObservation, transitionReferenceObservation } = require('../src/reference/observation');
const { createReferenceGateway } = require('../src/reference/gateway');
const { createFixtureProvider } = require('../src/reference/fixture-provider');

test('reference observation preserves provider payload and explicit provenance fields', () => {
  const o = createReferenceObservation({
    provider_id: 'fixture',
    provider_type: 'FIXTURE',
    request_id: 'r1',
    acquisition_id: 'a1',
    subject: 'wallet:1',
    retrieval_time: '2026-10-07T00:00:00Z',
    payload: { z: 1, a: 2 },
    provenance: { source: 'fixture' },
    independence_class: 'I0'
  });
  assert.equal(o.schema_version, 'REFERENCE_OBSERVATION_V1');
  assert.deepEqual(o.payload, { z: 1, a: 2 });
  assert.equal(o.independence_class, 'I0');
  assert.equal(o.status, 'OBSERVED');
});

test('unknown lineage cannot be promoted to corroborated', () => {
  const o = createReferenceObservation({
    provider_id: 'p', provider_type: 'x', request_id: 'r', acquisition_id: 'a',
    subject: 's', retrieval_time: 't'
  });
  assert.throws(
    () => transitionReferenceObservation(o, 'PROVENANCE_RECORDED', { reason: 'record' }),
    /REFERENCE_PROVENANCE_REQUIRED/
  );

  const p = createReferenceObservation({
    provider_id: 'p', provider_type: 'x', request_id: 'r', acquisition_id: 'a',
    subject: 's', retrieval_time: 't', provenance: { source: 'x' }
  });
  const pp = transitionReferenceObservation(p, 'PROVENANCE_RECORDED', { reason: 'record' });
  assert.throws(
    () => transitionReferenceObservation(pp, 'CORROBORATED'),
    /REFERENCE_INDEPENDENCE_UNKNOWN/
  );
});

test('gateway exposes provider only through bounded read-only observation interface', async () => {
  const gateway = createReferenceGateway({
    providers: { fixture: createFixtureProvider() },
    limits: { request_budget: 1, timeout_ms: 1000, response_bytes: 1024, pagination_limit: 2, concurrency: 1, retry_limit: 1 }
  });

  assert.deepEqual(gateway.providers, ['fixture']);

  const o = await gateway.observe({
    provider_id: 'fixture',
    request: { subject: 'wallet:1' },
    request_id: 'r1',
    acquisition_id: 'a1'
  });

  assert.equal(o.status, 'OBSERVED');
  assert.equal(o.payload.provider_assertion, 'NON_AUTHORITATIVE');

  await assert.rejects(
    () => gateway.observe({
      provider_id: 'fixture',
      request: { subject: 'wallet:2' },
      request_id: 'r2',
      acquisition_id: 'a2'
    }),
    /REFERENCE_REQUEST_BUDGET_EXCEEDED/
  );
});

test('provider timeout fails closed and does not create an observation', async () => {
  const gateway = createReferenceGateway({
    providers: {
      slow: {
        type: 'TEST',
        async observe() {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { ok: true };
        }
      }
    },
    limits: { request_budget: 1, timeout_ms: 10, response_bytes: 1024, pagination_limit: 2, concurrency: 1, retry_limit: 1 }
  });

  await assert.rejects(
    () => gateway.observe({
      provider_id: 'slow',
      request: { subject: 's' },
      request_id: 'r',
      acquisition_id: 'a'
    }),
    /REFERENCE_PROVIDER_TIMEOUT/
  );
});

test('corroboration requires provenance and known independence', () => {
  const o = createReferenceObservation({
    provider_id: 'p',
    provider_type: 'x',
    request_id: 'r',
    acquisition_id: 'a',
    subject: 's',
    retrieval_time: 't',
    provenance: { source: 'x' },
    independence_class: 'I3'
  });
  const p = transitionReferenceObservation(o, 'PROVENANCE_RECORDED', { reason: 'provenance recorded' });
  const c = transitionReferenceObservation(p, 'CORROBORATED', { reason: 'independent corroboration' });
  assert.equal(c.status, 'CORROBORATED');
});
