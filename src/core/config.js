'use strict';

/*
 * Runtime configuration from environment variables.
 *
 * HAHAWEEK_* names take precedence over the older unprefixed names, which
 * remain supported. Defaults are sized for Robinhood Chain (~10 blocks/s).
 */

const DEFAULT_RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';

const DEFAULTS = Object.freeze({
  CHAIN_ID: 4663,
  CONFIRMATIONS: 3,
  POLL_INTERVAL_MS: 5000,
  // Blocks per verified batch (one processing context + authority + cursor advance).
  CHUNK_SIZE: 500,
  // Batches per ingestion pass: 500 x 20 = 10,000 blocks (~17 min of chain time).
  MAX_BATCHES_PER_RUN: 20,
  MAX_RUNTIME_MS: 15 * 60 * 1000,
  MAX_RPC_CALLS_PER_RUN: 4096,
  // Concurrent eth_getBlockByNumber requests while building a canonical snapshot.
  HEADER_CONCURRENCY: 8,
});

function pick(env, names) {
  for (const name of names) {
    const value = env[name];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return { name, value: String(value).trim() };
    }
  }
  return null;
}

function readInteger(env, names, fallback, { min = 0 } = {}) {
  const found = pick(env, names);
  if (!found) return fallback;
  if (!/^\d+$/.test(found.value)) {
    throw new Error(`INVALID_CONFIG: ${found.name} must be an integer >= ${min}`);
  }
  const value = Number(found.value);
  if (!Number.isSafeInteger(value) || value < min) {
    throw new Error(`INVALID_CONFIG: ${found.name} must be an integer >= ${min}`);
  }
  return value;
}

function readConfig(env = process.env) {
  const rpcFound = pick(env, ['HAHAWEEK_RPC_URL', 'RPC_URL']);
  const RPC_URL = rpcFound ? rpcFound.value : DEFAULT_RPC_URL;

  const rpcList = pick(env, ['HAHAWEEK_RPC_URLS', 'RPC_URLS']);
  const RPC_URLS = [...new Set(
    (rpcList ? rpcList.value : RPC_URL)
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
  )];

  const CHUNK_SIZE = readInteger(env, ['HAHAWEEK_CHUNK_SIZE', 'CHUNK_SIZE'], DEFAULTS.CHUNK_SIZE, { min: 1 });

  const startFound = pick(env, ['HAHAWEEK_START_BLOCK']);
  const START_BLOCK = startFound
    ? readInteger(env, ['HAHAWEEK_START_BLOCK'], null, { min: 0 })
    : null;

  return Object.freeze({
    RPC_URL,
    RPC_URLS,
    CHAIN_ID: readInteger(env, ['CHAIN_ID'], DEFAULTS.CHAIN_ID, { min: 1 }),
    CONFIRMATIONS: readInteger(env, ['HAHAWEEK_CONFIRMATIONS', 'CONFIRMATIONS'], DEFAULTS.CONFIRMATIONS),
    POLL_INTERVAL_MS: readInteger(env, ['POLL_INTERVAL_MS'], DEFAULTS.POLL_INTERVAL_MS),
    CHUNK_SIZE,
    // eth_getLogs range per call inside a batch; defaults to the batch size.
    LOG_CHUNK_SIZE: readInteger(env, ['HAHAWEEK_LOG_CHUNK_SIZE'], CHUNK_SIZE, { min: 1 }),
    MAX_BATCHES_PER_RUN: readInteger(
      env,
      ['HAHAWEEK_MAX_BATCHES_PER_RUN', 'MAX_BATCHES_PER_RUN'],
      DEFAULTS.MAX_BATCHES_PER_RUN,
      { min: 1 }
    ),
    MAX_RUNTIME_MS: readInteger(env, ['HAHAWEEK_MAX_RUNTIME_MS', 'MAX_RUNTIME_MS'], DEFAULTS.MAX_RUNTIME_MS, { min: 1 }),
    MAX_RPC_CALLS_PER_RUN: readInteger(
      env,
      ['HAHAWEEK_MAX_RPC_CALLS_PER_RUN', 'MAX_RPC_CALLS_PER_RUN'],
      DEFAULTS.MAX_RPC_CALLS_PER_RUN,
      { min: 1 }
    ),
    HEADER_CONCURRENCY: readInteger(env, ['HAHAWEEK_HEADER_CONCURRENCY'], DEFAULTS.HEADER_CONCURRENCY, { min: 1 }),
    // First block to ingest when no cursor exists yet. null = start at the safe head.
    START_BLOCK,
  });
}

const config = readConfig();

module.exports = {
  ...config,
  DEFAULT_RPC_URL,
  DEFAULTS,
  readConfig,
};
