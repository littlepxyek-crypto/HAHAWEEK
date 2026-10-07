'use strict';

const { createReferenceObservation } = require('./reference-observation');

const DEFAULT_LIMITS = Object.freeze({
  timeoutMs: 5000,
  retryLimit: 0,
  concurrencyLimit: 1,
  requestBudget: 10,
  responseSizeLimit: 1024 * 1024,
  paginationLimit: 10,
});

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(Object.assign(new Error('REFERENCE_PROVIDER_TIMEOUT'), { code: 'TIMEOUT' }));
      }, timeoutMs),
    }),
  ]);
}

function validateLimits(limits) {
  Object.entries(limits).forEach(([key, value]) => {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('REFERENCE_RESOURCE_' + key.toUpperCase() + '_INVALID');
    }
  });
}

class ReferenceGateway {
  constructor({ providers = {}, limits = {}, cache = true, clock = () => new Date() } = {}) {
    this.providers = new Map(Object.entries(providers));
    this.limits = Object.freeze(Object.assign({}, DEFAULT_LIMITS, limits));
    validateLimits(this.limits);
    this.cacheEnabled = cache;
    this.clock = clock;
    this.cache = new Map();
    this.requestCount = 0;
    this.activeRequests = 0;
    this.providerHealth = new Map();
  }

  registerProvider(providerId, provider) {
    if (this.providers.has(providerId)) throw new Error('REFERENCE_PROVIDER_ALREADY_REGISTERED');
    if (!provider || typeof provider.observe !== 'function') {
      throw new Error('REFERENCE_PROVIDER_ADAPTER_REQUIRED');
    }
    this.providers.set(providerId, provider);
  }

  async observe({ providerId, requestId, acquisitionId, subject, asOfTime, request }) {
    if (!this.providers.has(providerId)) throw new Error('REFERENCE_PROVIDER_NOT_REGISTERED');
    if (this.requestCount >= this.limits.requestBudget) {
      return this.#failedObservation(providerId, requestId, acquisitionId, subject, asOfTime, 'REQUEST_BUDGET_EXHAUSTED');
    }
    if (this.activeRequests >= this.limits.concurrencyLimit) {
      return this.#failedObservation(providerId, requestId, acquisitionId, subject, asOfTime, 'CONCURRENCY_LIMIT');
    }

    const cacheKey = JSON.stringify([providerId, subject, asOfTime, request]);
    if (this.cacheEnabled && this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const provider = this.providers.get(providerId);
    const retrievalTime = this.clock().toISOString();
    let lastError = null;
    this.activeRequests += 1;
    this.requestCount += 1;

    try {
      for (let attempt = 0; attempt <= this.limits.retryLimit; attempt += 1) {
        try {
          const result = await withTimeout(
            Promise.resolve(provider.observe({ requestId, acquisitionId, subject, asOfTime, request })),
            this.limits.timeoutMs
          );
          if (!result || typeof result !== 'object') throw new Error('REFERENCE_PROVIDER_INVALID_RESPONSE');

          const providerPayload = result.provider_payload || result;
          if (Buffer.byteLength(JSON.stringify(providerPayload), 'utf8') > this.limits.responseSizeLimit) {
            throw Object.assign(new Error('REFERENCE_PROVIDER_RESPONSE_TOO_LARGE'), { code: 'RESPONSE_TOO_LARGE' });
          }

          const observation = createReferenceObservation({
            provider_id: providerId,
            provider_type: result.provider_type || 'UNKNOWN',
            provider_version: result.provider_version || 'UNKNOWN',
            request_id: requestId,
            acquisition_id: acquisitionId,
            subject,
            observation_time: result.observation_time || retrievalTime,
            retrieval_time: retrievalTime,
            as_of_time: asOfTime,
            source_reference: result.source_reference || 'UNKNOWN',
            provenance: result.provenance || { independence_classification: 'I0_UNKNOWN' },
            limitations: result.limitations,
            completeness_status: result.completeness_status || 'UNKNOWN',
            error_status: result.error_status || null,
            derivation_status: result.derivation_status || 'UNKNOWN',
            status: result.status || 'OBSERVED',
            provider_payload: providerPayload,
          });
          if (this.cacheEnabled) this.cache.set(cacheKey, observation);
          this.providerHealth.set(providerId, { status: 'HEALTHY', at: this.clock().toISOString() });
          return observation;
        } catch (error) {
          lastError = error;
          if (attempt < this.limits.retryLimit) await delay(Math.min(250 * (attempt + 1), 1000));
        }
      }

      this.providerHealth.set(providerId, {
        status: 'FAILED', at: this.clock().toISOString(),
        error: lastError && (lastError.code || lastError.message) || 'UNKNOWN',
      });
      return this.#failedObservation(providerId, requestId, acquisitionId, subject, asOfTime,
        lastError && (lastError.code || lastError.message) || 'PROVIDER_FAILED');
    } finally {
      this.activeRequests -= 1;
    }
  }

  #failedObservation(providerId, requestId, acquisitionId, subject, asOfTime, errorStatus) {
    const now = this.clock().toISOString();
    return createReferenceObservation({
      provider_id: providerId,
      provider_type: 'UNKNOWN',
      provider_version: 'UNKNOWN',
      request_id: requestId,
      acquisition_id: acquisitionId,
      subject,
      observation_time: now,
      retrieval_time: now,
      as_of_time: asOfTime,
      source_reference: 'UNAVAILABLE',
      provenance: { independence_classification: 'I0_UNKNOWN' },
      completeness_status: 'UNKNOWN',
      error_status: errorStatus,
      derivation_status: 'UNKNOWN',
      status: 'FAILED',
      provider_payload: {},
    });
  }

  getProviderHealth(providerId) {
    return this.providerHealth.get(providerId) || { status: 'UNKNOWN' };
  }

  getResourceUsage() {
    return Object.freeze({
      request_count: this.requestCount,
      active_requests: this.activeRequests,
      request_budget: this.limits.requestBudget,
      concurrency_limit: this.limits.concurrencyLimit,
    });
  }
}

module.exports = { ReferenceGateway, DEFAULT_LIMITS };
