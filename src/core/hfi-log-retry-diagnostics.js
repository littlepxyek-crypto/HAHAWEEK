'use strict';

const {
  isRetryableRpcError,
  isRangeLimitError,
} = require('./hfi-log-range-policy');

const SAFE_ERROR_CODES = new Set([
  'TIMEOUT', 'NETWORK_ERROR', 'SERVER_ERROR', 'UNKNOWN_ERROR', 'BAD_DATA',
  'CALL_EXCEPTION', 'INVALID_ARGUMENT', 'OFFCHAIN_FAULT', 'NONCE_EXPIRED',
  'REPLACEMENT_UNDERPRICED', 'INSUFFICIENT_FUNDS', 'ACTION_REJECTED',
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND',
  'EHOSTUNREACH', 'ERR_NETWORK', 'ERR_SOCKET_TIMEOUT',
  '429', '502', '503', '504', '-32000', '-32005',
]);

function ownDataValue(object, key) {
  if (object === null || (typeof object !== 'object' && typeof object !== 'function')) {
    return undefined;
  }

  try {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      return undefined;
    }
    return descriptor.value;
  } catch {
    // Provider-controlled proxies/descriptors are untrusted metadata.
    return undefined;
  }
}

function ownPrimitive(object, key) {
  const value = ownDataValue(object, key);
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

function safeErrorCode(error) {
  const direct = ownPrimitive(error, 'code');
  const nested = ownDataValue(error, 'error');
  const nestedCode = ownPrimitive(nested, 'code');
  const info = ownDataValue(error, 'info');
  const infoError = ownDataValue(info, 'error');
  const infoCode = ownPrimitive(infoError, 'code');
  const code = direct ?? nestedCode ?? infoCode;
  if (code === undefined) return null;
  const normalized = String(code).trim().toUpperCase();
  return SAFE_ERROR_CODES.has(normalized) ? normalized : null;
}

function classificationError(error) {
  const nestedError = ownDataValue(error, 'error');
  const info = ownDataValue(error, 'info');
  const infoError = ownDataValue(info, 'error');
  const cause = ownDataValue(error, 'cause');

  return {
    shortMessage: ownPrimitive(error, 'shortMessage'),
    message: ownPrimitive(error, 'message'),
    code: ownPrimitive(error, 'code'),
    error: {
      message: ownPrimitive(nestedError, 'message'),
      code: ownPrimitive(nestedError, 'code'),
    },
    info: { error: {
      message: ownPrimitive(infoError, 'message'),
      code: ownPrimitive(infoError, 'code'),
    } },
    cause: {
      message: ownPrimitive(cause, 'message'),
      code: ownPrimitive(cause, 'code'),
    },
  };
}

function diagnosticFor({ fromBlock, toBlock, attempt, durationMs, error, maxAttempts, canSplitRange = () => true }) {
  if (!error) {
    return {
      from_block: fromBlock,
      to_block: toBlock,
      attempt,
      duration_ms: durationMs,
      outcome: 'SUCCESS',
      error_category: null,
      error_code: null,
      retryable: false,
      decision: 'RETURN',
    };
  }

  const classifiedError = classificationError(error);
  const rangeLimit = isRangeLimitError(classifiedError);
  const retryable = isRetryableRpcError(classifiedError);
  return {
    from_block: fromBlock,
    to_block: toBlock,
    attempt,
    duration_ms: durationMs,
    outcome: 'ERROR',
    error_category: rangeLimit ? 'RANGE_LIMIT' : retryable ? 'TRANSIENT_RPC' : 'NON_RETRYABLE',
    error_code: safeErrorCode(error),
    retryable,
    decision: rangeLimit ? (canSplitRange() ? 'SPLIT' : 'FAIL') : retryable && attempt < maxAttempts ? 'RETRY' : 'FAIL',
  };
}

async function fetchLogRangeWithRetry({
  provider,
  filter,
  fromBlock,
  toBlock,
  maxAttempts = 3,
  beforeAttempt = () => {},
  onAttempt = () => {},
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random = Math.random,
  baseDelayMs = 250,
  maxDelayMs = 10000,
  canSplitRange = () => true,
}) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    beforeAttempt();
    const startedAt = Date.now();

    try {
      const result = await provider.getLogs({
        ...filter,
        fromBlock,
        toBlock,
      });
      const event = diagnosticFor({
        fromBlock, toBlock, attempt,
        durationMs: Math.max(0, Date.now() - startedAt),
        error: null,
        maxAttempts,
      });
      try { onAttempt(event); } catch { /* Diagnostics must not change acquisition behavior. */ }
      return result;
    } catch (error) {
      lastError = error;
      const classifiedError = classificationError(error);
      const rangeLimit = isRangeLimitError(classifiedError);
      const retryable = isRetryableRpcError(classifiedError);
      const event = diagnosticFor({
        fromBlock, toBlock, attempt,
        durationMs: Math.max(0, Date.now() - startedAt),
        error,
        maxAttempts,
        canSplitRange,
      });
      try { onAttempt(event); } catch { /* Diagnostics must not change acquisition behavior. */ }

      if (rangeLimit || !retryable || attempt >= maxAttempts) throw lastError;

      const backoff = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
      const jitter = 0.75 + random() * 0.5;
      await sleep(Math.round(backoff * jitter));
    }
  }

  throw lastError;
}

module.exports = { fetchLogRangeWithRetry, diagnosticFor, safeErrorCode };
