'use strict';

function sleep(ms) {
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function calculateDelay(attempt, baseDelayMs) {
  return baseDelayMs * (2 ** (attempt - 1));
}

async function rpcCall(fn, options = {}) {
  if (typeof fn !== 'function') {
    throw new Error('RPC_FUNCTION_REQUIRED');
  }

  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('INVALID_MAX_ATTEMPTS');
  }

  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) {
    throw new Error('INVALID_BASE_DELAY');
  }

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, baseDelayMs);
      await sleep(delay);
    }
  }

  throw lastError;
}

module.exports = {
  sleep,
  calculateDelay,
  rpcCall,
};
