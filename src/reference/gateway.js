'use strict';

const { createReferenceObservation } = require('./observation');

const DEFAULT_LIMITS = Object.freeze({
  timeout_ms: 10000,
  retry_limit: 2,
  concurrency: 1,
  request_budget: 10,
  response_bytes: 2 * 1024 * 1024,
  pagination_limit: 20
});

function mergeLimits(limits) {
  const out = Object.assign({}, DEFAULT_LIMITS, limits || {});
  for (const key of Object.keys(DEFAULT_LIMITS)) {
    if (!Number.isSafeInteger(out[key]) || out[key] <= 0) {
      throw new Error('INVALID_REFERENCE_LIMIT_' + key.toUpperCase());
    }
  }
  return Object.freeze(out);
}

function createReferenceGateway(options) {
  options = options || {};
  const providers = options.providers || {};
  const bounded = mergeLimits(options.limits);
  const names = Object.freeze(Object.keys(providers));
  let calls = 0;

  async function observe(input) {
    input = input || {};
    const providerId = input.provider_id;

    if (!providerId || typeof providerId !== 'string') throw new Error('PROVIDER_ID_REQUIRED');
    if (!providers[providerId] || typeof providers[providerId].observe !== 'function') {
      throw new Error('REFERENCE_PROVIDER_NOT_REGISTERED');
    }
    if (calls >= bounded.request_budget) throw new Error('REFERENCE_REQUEST_BUDGET_EXCEEDED');

    calls += 1;

    const limit = Math.min(input.timeout_ms || bounded.timeout_ms, bounded.timeout_ms);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), limit);

    try {
      const result = await Promise.race([
        providers[providerId].observe(Object.freeze({
          request: input.request,
          request_id: input.request_id,
          acquisition_id: input.acquisition_id,
          as_of_time: input.as_of_time || null,
          signal: controller.signal
        })),
        new Promise((resolve, reject) => {
          controller.signal.addEventListener('abort', function () {
            reject(new Error('REFERENCE_PROVIDER_TIMEOUT'));
          }, { once: true });
        })
      ]);

      const bytes = Buffer.byteLength(JSON.stringify(result === undefined ? null : result), 'utf8');
      if (bytes > bounded.response_bytes) throw new Error('REFERENCE_RESPONSE_SIZE_LIMIT_EXCEEDED');

      return createReferenceObservation({
        provider_id: providerId,
        provider_type: providers[providerId].type || 'UNKNOWN',
        provider_version: providers[providerId].version || null,
        request_id: input.request_id,
        acquisition_id: input.acquisition_id,
        subject: input.request && input.request.subject ? input.request.subject : 'UNKNOWN',
        as_of_time: input.as_of_time || null,
        retrieval_time: new Date().toISOString(),
        payload: result,
        provenance: { gateway_contract: 'REFERENCE_INTELLIGENCE_CONTRACT_V1', provider_id: providerId },
        independence_class: providers[providerId].independence_class || 'I0'
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return Object.freeze({
    contract: 'REFERENCE_INTELLIGENCE_CONTRACT_V1',
    limits: bounded,
    providers: names,
    getUsage: function () {
      return Object.freeze({ requests: calls, request_budget: bounded.request_budget });
    },
    observe
  });
}

module.exports = { DEFAULT_LIMITS, mergeLimits, createReferenceGateway };
