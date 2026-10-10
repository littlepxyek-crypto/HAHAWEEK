'use strict';

function rpcErrorText(error) {
  return String([
    error?.shortMessage,
    error?.message,
    error?.error?.message,
    error?.info?.error?.message,
    error?.cause?.message,
    error?.code,
  ].filter(Boolean).join(' ')).toLowerCase();
}

function isRetryableRpcError(error) {
  return /timeout|timed out|rate limit|too many requests|429|502|503|504|temporarily unavailable|service unavailable|gateway timeout|network error|socket hang up|econnreset|econnrefused/.test(rpcErrorText(error));
}

function isRangeLimitError(error) {
  // A transport/rate-limit failure takes precedence over incidental range wording
  // in the provider message. Only explicit, non-transient range/result-limit
  // rejection may trigger adaptive splitting.
  if (isRetryableRpcError(error)) return false;

  return /logs? matched|too many logs|too many results|result[s]? limit|returned[^\n]{0,60}(?:\d+\s+)?results|exceeds (?:the )?(?:maximum )?(?:block )?range|block range[^\n]{0,40}(?:too large|too wide|exceeds?|maximum|limit)|query range[^\n]{0,40}(?:too large|too wide|exceeds?|maximum|limit)|max(?:imum)? .*range/.test(rpcErrorText(error));
}

// Split only when the endpoint explicitly rejects the queried block range.
// Transient transport/rate-limit failures are retried a bounded number of times,
// then surfaced. Splitting those failures multiplies requests and can amplify an outage.
function shouldSplitLogRange(error) {
  return isRangeLimitError(error);
}

module.exports = { rpcErrorText, isRetryableRpcError, isRangeLimitError, shouldSplitLogRange };
