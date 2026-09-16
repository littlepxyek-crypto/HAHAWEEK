'use strict';

function calculateBackoff(attempt, baseDelayMs = 250) {
  if (!Number.isInteger(attempt) || attempt < 0) {
    throw new Error('INVALID_ATTEMPT');
  }

  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) {
    throw new Error('INVALID_BASE_DELAY');
  }

  return baseDelayMs * (2 ** attempt);
}

async function retry(operation, options = {}) {
  if (typeof operation !== 'function') {
    throw new Error('OPERATION_REQUIRED');
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

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts - 1) {
        throw lastError;
      }

      const delayMs = calculateBackoff(attempt, baseDelayMs);

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

module.exports = {
  calculateBackoff,
  retry,
};
