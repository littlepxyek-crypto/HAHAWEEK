'use strict';

function sleep(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateDelay(attempt, baseDelayMs) {
  return baseDelayMs * (2 ** (attempt - 1));
}

function createRuntimeBudget(options = {}) {
  const maxRuntimeMs = options.maxRuntimeMs ?? Number(process.env.MAX_RUNTIME_MS || 15 * 60 * 1000);
  const maxCalls = options.maxCalls ?? Number(process.env.MAX_RPC_CALLS_PER_RUN || 4096);
  const startedAt = options.startedAt ?? Date.now();
  let calls = 0;

  if (!Number.isSafeInteger(maxRuntimeMs) || maxRuntimeMs <= 0) {
    throw new Error('INVALID_RUNTIME_BUDGET');
  }
  if (!Number.isSafeInteger(maxCalls) || maxCalls <= 0) {
    throw new Error('INVALID_RPC_CALL_BUDGET');
  }

  function assertWithinBudget() {
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs > maxRuntimeMs) {
      const error = new Error('RUNTIME_RESOURCE_TIMEOUT');
      error.code = 'RUNTIME_RESOURCE_TIMEOUT';
      error.elapsed_ms = elapsedMs;
      error.rpc_calls = calls;
      throw error;
    }
    if (calls >= maxCalls) {
      const error = new Error('RPC_CALL_BUDGET_EXCEEDED');
      error.code = 'RPC_CALL_BUDGET_EXCEEDED';
      error.elapsed_ms = elapsedMs;
      error.rpc_calls = calls;
      throw error;
    }
  }

  function consumeCall() {
    assertWithinBudget();
    calls += 1;
    return calls;
  }

  return {
    assertWithinBudget,
    consumeCall,
    elapsedMs: () => Date.now() - startedAt,
    calls: () => calls,
    maxRuntimeMs,
    maxCalls,
  };
}

async function rpcCall(fn, options = {}) {
  if (typeof fn !== 'function') {
    throw new Error('RPC_FUNCTION_REQUIRED');
  }

  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const budget = options.budget;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('INVALID_MAX_ATTEMPTS');
  }
  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) {
    throw new Error('INVALID_BASE_DELAY');
  }

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (budget) budget.consumeCall();
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) throw lastError;
      if (budget) budget.assertWithinBudget();
      await sleep(calculateDelay(attempt, baseDelayMs));
    }
  }

  throw lastError;
}

module.exports = {
  sleep,
  calculateDelay,
  createRuntimeBudget,
  rpcCall,
};
