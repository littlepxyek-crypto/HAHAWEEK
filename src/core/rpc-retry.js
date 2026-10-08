"use strict";

function errorText(error) {
  return String([
    error?.shortMessage,
    error?.message,
    error?.error?.message,
    error?.info?.error?.message,
    error?.cause?.message,
    error?.code,
  ].filter(Boolean).join(" ")).toLowerCase();
}

function isRetryableRpcError(error) {
  return /timeout|timed out|rate limit|too many requests|429|502|503|504|temporarily unavailable|service unavailable|gateway timeout|network error|socket hang up|econnreset|econnrefused/.test(errorText(error));
}

function sleep(ms, sleepFn) {
  return (sleepFn || ((delay) => new Promise(resolve => setTimeout(resolve, delay))))(ms);
}

async function getBlockWithRetry(provider, blockNumber, options = {}) {
  if (!provider || typeof provider.getBlock !== "function") throw new TypeError("RPC_PROVIDER_REQUIRED");
  if (!Number.isInteger(blockNumber) || blockNumber < 0) throw new TypeError("BLOCK_NUMBER_INVALID");

  const maxAttempts = Number.isInteger(options.maxAttempts) && options.maxAttempts > 0 ? options.maxAttempts : 3;
  const baseDelayMs = Number.isFinite(options.baseDelayMs) && options.baseDelayMs >= 0 ? options.baseDelayMs : 250;
  const maxDelayMs = Number.isFinite(options.maxDelayMs) && options.maxDelayMs >= baseDelayMs ? options.maxDelayMs : 5000;
  const jitterRatio = Number.isFinite(options.jitterRatio) && options.jitterRatio >= 0 ? options.jitterRatio : 0.25;
  const random = typeof options.random === "function" ? options.random : Math.random;
  const onRetry = typeof options.onRetry === "function" ? options.onRetry : () => {};
  let attempts = 0;
  let lastError;

  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      const block = await provider.getBlock(blockNumber);
      return { block, attempts, retries: attempts - 1 };
    } catch (error) {
      lastError = error;
      if (!isRetryableRpcError(error) || attempts >= maxAttempts) break;
      const exponential = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempts - 1)));
      const jitter = exponential * jitterRatio * Math.max(0, Math.min(1, random()));
      const delayMs = Math.min(maxDelayMs, Math.round(exponential + jitter));
      onRetry({ blockNumber, attempt: attempts, next_attempt: attempts + 1, delay_ms: delayMs, error_code: error?.code || null });
      await sleep(delayMs, options.sleep);
    }
  }

  throw Object.assign(lastError instanceof Error ? lastError : new Error(String(lastError)), {
    block_number: blockNumber,
    attempts,
    retries: Math.max(0, attempts - 1),
  });
}

module.exports = { isRetryableRpcError, getBlockWithRetry };
