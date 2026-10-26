'use strict';

/*
 * Retry with exponential backoff + jitter for JSON-RPC transport failures.
 *
 * Retried: HTTP 429, HTTP 5xx, timeouts, connection resets/refusals, and
 * JSON-RPC rate-limit errors (-32005 / -32029 / "rate limit" / "too many
 * requests"). Never retried: anything else (bad params, "logs matched by query
 * exceeds limit", chain-id mismatch, ...), because retrying cannot fix it.
 *
 * A Retry-After header is honoured. When it asks for a longer wait than
 * maxDelayMs we do not wait and do not hammer: we give up and surface
 * RPC_UNAVAILABLE so the caller fails the batch with the cursor unchanged.
 *
 * When retries are exhausted the error is re-thrown as code RPC_UNAVAILABLE
 * (classified PROVIDER_UNAVAILABLE / RETRYABLE by operational-state), with the
 * original error as `cause` and `hahaweekRetryExhausted = true` so outer
 * retry wrappers (rpc-call.js) do not multiply the attempts.
 *
 * This module never touches the cursor. A failed RPC call rejects the current
 * batch before the authority gate, so the cursor stays where it was.
 */

const RATE_LIMIT_JSON_CODES = new Set([-32005, -32029, -32090]);

function sleep(ms) {
  if (!(ms > 0)) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
}

function statusOf(error) {
  const candidates = [
    error?.status,
    error?.statusCode,
    error?.response?.statusCode,
    error?.response?.status,
    error?.info?.response?.statusCode,
    error?.cause?.status,
    error?.cause?.statusCode,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isInteger(n) && n >= 100 && n <= 599) return n;
  }
  const text = String(error?.info?.responseStatus || error?.shortMessage || error?.message || '');
  const match = text.match(/\b(429|5\d\d)\b/);
  return match ? Number(match[1]) : null;
}

function headerOf(error, name) {
  const lower = name.toLowerCase();
  const sources = [
    error?.headers,
    error?.response?.headers,
    error?.info?.response?.headers,
    error?.cause?.headers,
  ];
  for (const headers of sources) {
    if (!headers) continue;
    if (typeof headers.get === 'function') {
      const value = headers.get(lower);
      if (value !== null && value !== undefined) return String(value);
      continue;
    }
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === lower) return String(headers[key]);
    }
  }
  return null;
}

function errorText(error) {
  return [
    error?.code,
    error?.shortMessage,
    error?.message,
    error?.error?.message,
    error?.info?.error?.message,
    error?.cause?.code,
    error?.cause?.message,
  ].filter(Boolean).join(' ').toLowerCase();
}

/*
 * Returns { retryable, reason, status, retryAfterMs }.
 */
function classifyRpcError(error, { now = Date.now() } = {}) {
  const status = statusOf(error);
  const retryAfterMs = parseRetryAfter(headerOf(error, 'retry-after'), now);
  const jsonCode = Number(error?.error?.code ?? error?.info?.error?.code ?? error?.rpcCode);

  if (status === 429) return { retryable: true, reason: 'HTTP_429', status, retryAfterMs };
  if (status !== null && status >= 500 && status <= 599) {
    return { retryable: true, reason: `HTTP_${status}`, status, retryAfterMs };
  }
  if (RATE_LIMIT_JSON_CODES.has(jsonCode)) {
    return { retryable: true, reason: 'RPC_RATE_LIMIT', status, retryAfterMs };
  }

  const text = errorText(error);
  if (/rate limit|too many requests|request limit|capacity exceeded/.test(text)) {
    return { retryable: true, reason: 'RPC_RATE_LIMIT', status, retryAfterMs };
  }
  if (/timeout|timed out|etimedout|und_err_.*timeout/.test(text)) {
    return { retryable: true, reason: 'TIMEOUT', status, retryAfterMs };
  }
  if (/econnreset|econnrefused|eai_again|enotfound|socket hang up|network error|fetch failed|und_err_socket|bad gateway|service unavailable|gateway timeout|temporarily unavailable/.test(text)) {
    return { retryable: true, reason: 'NETWORK', status, retryAfterMs };
  }
  return { retryable: false, reason: 'NON_RETRYABLE', status, retryAfterMs };
}

/*
 * Retry-After is either delta-seconds or an HTTP-date. Returns ms or null.
 */
function parseRetryAfter(value, now = Date.now()) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === '') return null;
  if (/^\d+$/.test(text)) return Number(text) * 1000;
  const date = Date.parse(text);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - now);
}

/*
 * attempt is 1-based (1 = delay before the 2nd try).
 * "Full jitter" on top of half the exponential step keeps a floor so a
 * retry never fires instantly: delay in [exp/2, exp], capped at maxDelayMs.
 */
function computeBackoffDelay({ attempt, baseDelayMs, maxDelayMs, random = Math.random }) {
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error('INVALID_ATTEMPT');
  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) throw new Error('INVALID_BASE_DELAY');
  if (!Number.isFinite(maxDelayMs) || maxDelayMs < baseDelayMs) throw new Error('INVALID_MAX_DELAY');
  const exponential = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
  const r = Math.max(0, Math.min(1, Number(random())));
  return Math.round(exponential / 2 + (exponential / 2) * r);
}

function normalizeRetryOptions(options = {}) {
  const maxAttempts = options.maxAttempts ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 60000;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new Error('INVALID_MAX_ATTEMPTS');
  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) throw new Error('INVALID_BASE_DELAY');
  if (!Number.isFinite(maxDelayMs) || maxDelayMs < baseDelayMs) throw new Error('INVALID_MAX_DELAY');
  return { maxAttempts, baseDelayMs, maxDelayMs };
}

function exhausted(lastError, attempts, reason) {
  const error = new Error('RPC_UNAVAILABLE');
  error.code = 'RPC_UNAVAILABLE';
  error.reason = reason;
  error.attempts = attempts;
  error.cause = lastError;
  error.hahaweekRetryExhausted = true;
  return error;
}

async function withBackoff(operation, options = {}) {
  if (typeof operation !== 'function') throw new Error('OPERATION_REQUIRED');
  const { maxAttempts, baseDelayMs, maxDelayMs } = normalizeRetryOptions(options);
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const sleepFn = typeof options.sleep === 'function' ? options.sleep : sleep;
  const onRetry = typeof options.onRetry === 'function' ? options.onRetry : () => {};
  const now = typeof options.now === 'function' ? options.now : Date.now;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      const verdict = classifyRpcError(error, { now: now() });
      if (!verdict.retryable) throw error;
      if (attempt >= maxAttempts) throw exhausted(error, attempt, verdict.reason);

      let delayMs;
      if (verdict.retryAfterMs !== null) {
        // The server told us how long to wait. If that is longer than we are
        // willing to wait inside one pass, stop now instead of hammering.
        if (verdict.retryAfterMs > maxDelayMs) {
          throw exhausted(error, attempt, `${verdict.reason}_RETRY_AFTER_TOO_LONG`);
        }
        delayMs = verdict.retryAfterMs;
      } else {
        delayMs = computeBackoffDelay({ attempt, baseDelayMs, maxDelayMs, random });
      }
      onRetry({ attempt, nextAttempt: attempt + 1, delayMs, reason: verdict.reason, status: verdict.status });
      await sleepFn(delayMs);
    }
  }
}

/*
 * A JSON-RPC response can carry a rate-limit error inside a 200 body.
 * Throw it so withBackoff can see it; any other error result is passed through
 * unchanged for ethers to surface.
 */
function assertNoRateLimitResult(results) {
  const list = Array.isArray(results) ? results : [results];
  for (const item of list) {
    const err = item && item.error;
    if (!err) continue;
    const code = Number(err.code);
    const message = String(err.message || '').toLowerCase();
    if (RATE_LIMIT_JSON_CODES.has(code) || /rate limit|too many requests/.test(message)) {
      const error = new Error(`RPC_RATE_LIMIT: ${err.message || code}`);
      error.rpcCode = code;
      throw error;
    }
  }
  return results;
}

module.exports = {
  RATE_LIMIT_JSON_CODES,
  classifyRpcError,
  parseRetryAfter,
  computeBackoffDelay,
  normalizeRetryOptions,
  withBackoff,
  assertNoRateLimitResult,
  sleep,
};
