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
    processing_time: '2026-10-07T00:00:01Z',
    payload: { z: 1, a: 2 },
    provenance: { source: 'fixture' },
    source_reference: 'fixture://1',
    completeness_status: 'COMPLETE',
    independence_class: 'I0'
  });
  assert.equal(o.schema_version, 'REFERENCE_OBSERVATION_V1');
  assert.deepEqual(o.payload, { z: 1, a: 2 });
  assert.equal(o.independence_class, 'I0');
  assert.equal(o.status, 'OBSERVED');
  assert.equal(o.processing_time, '2026-10-07T00:00:01Z');
});

test('unknown lineage cannot be promoted to corroborated', () => {
  const o = createReferenceObservation({
    provider_id: 'p', provider_type: 'x', request_id: 'r', acquisition_id: 'a',
    subject: 's', retrieval_time: 't', provenance: { source: 'x' }
  });
  const p = transitionReferenceObservation(o, 'PROVENANCE_RECORDED', { reason: 'record' });
  assert.throws(
    () => transitionReferenceObservation(p, 'CORROBORATED'),
    /REFERENCE_INDEPENDENCE_NOT_SUFFICIENT/
  );
});

test('correlated and same-lineage sources cannot satisfy corroboration', () => {
  for (const independence_class of ['I1', 'I2']) {
    const o = createReferenceObservation({
      provider_id: 'p', provider_type: 'x', request_id: 'r', acquisition_id: 'a',
      subject: 's', retrieval_time: 't', provenance: { source: 'x' }, independence_class
    });
    const p = transitionReferenceObservation(o, 'PROVENANCE_RECORDED', { reason: 'record' });
    assert.throws(() => transitionReferenceObservation(p, 'CORROBORATED'), /REFERENCE_INDEPENDENCE_NOT_SUFFICIENT/);
  }
});

test('gateway requires an explicit provider result envelope and preserves provenance', async () => {
  const gateway = createReferenceGateway({
    providers: { fixture: createFixtureProvider() },
    limits: { request_budget: 1, timeout_ms: 1000, response_bytes: 1024, pagination_limit: 2, concurrency: 1, retry_limit: 1 }
  });

  const o = await gateway.observe({
    provider_id: 'fixture',
    request: { subject: 'wallet:1' },
    request_id: 'r1',
    acquisition_id: 'a1'
  });

  assert.equal(o.status, 'OBSERVED');
  assert.equal(o.payload.provider_assertion, 'NON_AUTHORITATIVE');
  assert.deepEqual(o.provenance.provider, { source: 'controlled-fixture', acquisition: 'test-adapter' });
  assert.equal(o.source_reference, 'fixture://reference-intelligence-v1');
  assert.equal(o.completeness_status, 'COMPLETE');

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

test('gateway rejects provider output without provenance envelope', async () => {
  const gateway = createReferenceGateway({
    providers: { invalid: { type: 'TEST', async observe() { return { payload: { ok: true } }; } } },
    limits: { request_budget: 1, timeout_ms: 1000, response_bytes: 1024, pagination_limit: 2, concurrency: 1, retry_limit: 0 }
  });
  await assert.rejects(
    () => gateway.observe({ provider_id: 'invalid', request: { subject: 's' }, request_id: 'r', acquisition_id: 'a' }),
    /REFERENCE_PROVIDER_PROVENANCE_REQUIRED/
  );
});

test('historical as-of mismatch becomes explicit UNKNOWN, never current-state truth', async () => {
  const gateway = createReferenceGateway({
    providers: {
      current_only: {
        type: 'TEST',
        async observe() {
          return {
            payload: { state: 'current' },
            as_of_time: '2026-10-07T13:00:00Z',
            provenance: { source: 'current-only' },
            completeness_status: 'COMPLETE'
          };
        }
      }
    },
    limits: { request_budget: 1, timeout_ms: 1000, response_bytes: 1024, pagination_limit: 2, concurrency: 1, retry_limit: 0 }
  });

  const o = await gateway.observe({
    provider_id: 'current_only',
    request: { subject: 's' },
    as_of_time: '2026-10-01T00:00:00Z',
    request_id: 'r',
    acquisition_id: 'a'
  });
  assert.equal(o.status, 'UNKNOWN');
  assert.equal(o.completeness_status, 'UNKNOWN');
  assert.ok(o.limitations.includes('AS_OF_UNVERIFIED'));
});

test('provider identity labels remain non-authoritative payload', async () => {
  const gateway = createReferenceGateway({
    providers: {
      labeler: {
        type: 'LABELER',
        async observe() {
          return {
            payload: { identity_label: 'person:alice', confidence: 0.99, authority_status: 'ACTIVE' },
            provenance: { source: 'third-party-label' },
            completeness_status: 'COMPLETE',
            independence_class: 'I0'
          };
        }
      }
    },
    limits: { request_budget: 1, timeout_ms: 1000, response_bytes: 1024, pagination_limit: 2, concurrency: 1, retry_limit: 0 }
  });
  const o = await gateway.observe({ provider_id: 'labeler', request: { subject: 'wallet:1' }, request_id: 'r', acquisition_id: 'a' });
  assert.deepEqual(o.payload, { identity_label: 'person:alice', confidence: 0.99, authority_status: 'ACTIVE' });
  assert.equal(o.independence_class, 'I0');
  assert.equal(o.status, 'OBSERVED');
});

test('provider timeout fails closed and does not create an observation', async () => {
  const gateway = createReferenceGateway({
    providers: {
      slow: {
        type: 'TEST',
        async observe() {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { payload: { ok: true }, provenance: { source: 'slow' }, completeness_status: 'COMPLETE' };
        }
      }
    },
    limits: { request_budget: 1, timeout_ms: 10, response_bytes: 1024, pagination_limit: 2, concurrency: 1, retry_limit: 1 }
  });

  await assert.rejects(
    () => gateway.observe({ provider_id: 'slow', request: { subject: 's' }, request_id: 'r', acquisition_id: 'a' }),
    /REFERENCE_PROVIDER_TIMEOUT/
  );
});

test('corroboration requires provenance and known independent evidence', () => {
  const o = createReferenceObservation({
    provider_id: 'p', provider_type: 'x', request_id: 'r', acquisition_id: 'a',
    subject: 's', retrieval_time: 't', provenance: { source: 'x' }, independence_class: 'I3'
  });
  const p = transitionReferenceObservation(o, 'PROVENANCE_RECORDED', { reason: 'provenance recorded' });
  const c = transitionReferenceObservation(p, 'CORROBORATED', { reason: 'independent corroboration' });
  assert.equal(c.status, 'CORROBORATED');
});

test('VALIDATED requires explicit validation context and never self-authorizes', () => {
  const o = createReferenceObservation({
    provider_id: 'p', provider_type: 'x', request_id: 'r', acquisition_id: 'a',
    subject: 's', retrieval_time: 't', provenance: { source: 'x' }, independence_class: 'I4'
  });
  const p = transitionReferenceObservation(o, 'PROVENANCE_RECORDED', { reason: 'provenance recorded' });
  const c = transitionReferenceObservation(p, 'CORROBORATED', { reason: 'independent corroboration' });
  const a = transitionReferenceObservation(c, 'ANALYTICALLY_RELEVANT', { reason: 'analysis' });
  assert.throws(() => transitionReferenceObservation(a, 'VALIDATED'), /REFERENCE_VALIDATION_CONTEXT_REQUIRED/);
  const v = transitionReferenceObservation(a, 'VALIDATED', {
    reason: 'external validation contract',
    validation_ref: 'validation:1',
    validation_rule_version: 'VALIDATION_STATE_V2'
  });
  assert.equal(v.status, 'VALIDATED');
  assert.equal(v.transition.validation_ref, 'validation:1');
});

test('gateway enforces concurrency and bounded retry budget', async () => {
  let attempts = 0;
  const gateway = createReferenceGateway({
    providers: {
      retryable: {
        type: 'TEST',
        async observe() {
          attempts += 1;
          if (attempts === 1) {
            const error = new Error('temporary');
            error.retryable = true;
            throw error;
          }
          return { payload: { ok: true }, provenance: { source: 'retryable' }, completeness_status: 'COMPLETE' };
        }
      },
      slow: {
        type: 'TEST',
        async observe() {
          await new Promise(resolve => setTimeout(resolve, 30));
          return { payload: { ok: true }, provenance: { source: 'slow' }, completeness_status: 'COMPLETE' };
        }
      }
    },
    limits: { request_budget: 4, timeout_ms: 1000, response_bytes: 1024, pagination_limit: 2, concurrency: 1, retry_limit: 1 }
  });

  const retryObservation = await gateway.observe({
    provider_id: 'retryable',
    request: { subject: 's' },
    request_id: 'r-retry',
    acquisition_id: 'a-retry'
  });
  assert.equal(retryObservation.status, 'OBSERVED');
  assert.equal(attempts, 2);

  const pending = gateway.observe({
    provider_id: 'slow',
    request: { subject: 's1' },
    request_id: 'r1',
    acquisition_id: 'a1'
  });
  await assert.rejects(
    () => gateway.observe({
      provider_id: 'slow',
      request: { subject: 's2' },
      request_id: 'r2',
      acquisition_id: 'a2'
    }),
    /REFERENCE_CONCURRENCY_LIMIT_EXCEEDED/
  );
  await pending;
});

test('gateway enforces pagination limit for bounded collection responses', async () => {
  const gateway = createReferenceGateway({
    providers: {
      paged: {
        type: 'TEST',
        async observe() {
          return {
            payload: { items: [1, 2, 3] },
            provenance: { source: 'paged' },
            completeness_status: 'PARTIAL'
          };
        }
      }
    },
    limits: { request_budget: 1, timeout_ms: 1000, response_bytes: 1024, pagination_limit: 2, concurrency: 1, retry_limit: 1 }
  });

  await assert.rejects(
    () => gateway.observe({ provider_id: 'paged', request: { subject: 's' }, request_id: 'r', acquisition_id: 'a' }),
    /REFERENCE_PAGINATION_LIMIT_EXCEEDED/
  );
});
