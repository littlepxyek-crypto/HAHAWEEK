'use strict';

const http = require('node:http');
const https = require('node:https');
const { ethers } = require('ethers');

const {
  RPC_URL,
  CHAIN_ID,
  RPC_TIMEOUT_MS,
  RPC_RETRY_MAX_ATTEMPTS,
  RPC_RETRY_BASE_MS,
  RPC_RETRY_MAX_MS,
} = require('./config');
const { redactUrl } = require('./redact');
const { withBackoff, assertNoRateLimitResult } = require('./rpc-backoff');

/*
 * Keep-alive HTTP(S) agents shared by every provider in the process, so
 * consecutive JSON-RPC requests reuse TCP/TLS connections instead of paying a
 * new handshake each time. Idle sockets are unref'd by Node and never keep
 * the process alive.
 */
const AGENT_OPTIONS = Object.freeze({ keepAlive: true, keepAliveMsecs: 15000, maxSockets: 32, maxFreeSockets: 16 });
const agents = {
  http: new http.Agent(AGENT_OPTIONS),
  https: new https.Agent(AGENT_OPTIONS),
};

function agentFor(url) {
  return String(url).toLowerCase().startsWith('https:') ? agents.https : agents.http;
}

function createRpcRequest(url = RPC_URL, { timeoutMs = RPC_TIMEOUT_MS } = {}) {
  const request = new ethers.FetchRequest(url);
  request.timeout = timeoutMs;
  request.getUrlFunc = ethers.FetchRequest.createGetUrlFunc({ agent: agentFor(url) });
  // Disable ethers' own hidden 429 loop (12 attempts, Retry-After read as ms).
  // 429 surfaces to BackoffJsonRpcProvider, which honours Retry-After in seconds.
  request.retryFunc = async () => false;
  return request;
}

/*
 * JsonRpcProvider whose transport (_send) retries 429 / 5xx / timeouts /
 * network errors with exponential backoff + jitter. Every RPC call made by the
 * live path (getNetwork, getBlockNumber, getBlock, getLogs) goes through
 * _send, so this is the single retry point. Failure after the last attempt
 * rejects the call with RPC_UNAVAILABLE; the batch fails and the cursor does
 * not move.
 */
class BackoffJsonRpcProvider extends ethers.JsonRpcProvider {
  constructor(request, network, options = {}, retry = {}) {
    super(request, network, options);
    this.hahaweekRetry = {
      maxAttempts: retry.maxAttempts ?? RPC_RETRY_MAX_ATTEMPTS,
      baseDelayMs: retry.baseDelayMs ?? RPC_RETRY_BASE_MS,
      maxDelayMs: retry.maxDelayMs ?? RPC_RETRY_MAX_MS,
      sleep: retry.sleep,
      random: retry.random,
      onRetry: retry.onRetry || (info => {
        console.warn(
          `HAHAWEEK RPC: ${info.reason}${info.status ? ` (${info.status})` : ''};` +
          ` retry ${info.nextAttempt}/${this.hahaweekRetry.maxAttempts} in ${info.delayMs}ms`
        );
      }),
    };
  }

  async _send(payload) {
    return withBackoff(
      async () => assertNoRateLimitResult(await super._send(payload)),
      this.hahaweekRetry
    );
  }
}

function createProvider({ url = RPC_URL, retry = {}, timeoutMs } = {}) {
  const request = createRpcRequest(url, timeoutMs ? { timeoutMs } : undefined);

  const network = ethers.Network.from({
    name: 'robinhood-mainnet',
    chainId: CHAIN_ID,
  });

  return new BackoffJsonRpcProvider(
    request,
    network,
    {
      batchMaxCount: 1,
    },
    retry
  );
}

async function getRpcStatus() {
  const provider = createProvider();

  try {
    const network = await provider.getNetwork();
    const actualChainId = Number(network.chainId);

    if (actualChainId !== CHAIN_ID) {
      throw new Error(
        `CHAIN_ID_MISMATCH: expected ${CHAIN_ID}, got ${actualChainId}`
      );
    }

    const blockNumber = await provider.getBlockNumber();

    return {
      // Never expose a keyed RPC URL through status/health output.
      rpcUrl: redactUrl(RPC_URL),
      expectedChainId: CHAIN_ID,
      actualChainId,
      blockNumber,
    };
  } finally {
    provider.destroy();
  }
}

function destroyAgents() {
  agents.http.destroy();
  agents.https.destroy();
}

module.exports = {
  RPC_TIMEOUT_MS,
  AGENT_OPTIONS,
  agentFor,
  destroyAgents,
  BackoffJsonRpcProvider,
  createRpcRequest,
  createProvider,
  getRpcStatus,
};
