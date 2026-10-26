'use strict';

/*
 * Runtime configuration from environment variables.
 *
 * HAHAWEEK_* names take precedence over the older unprefixed names, which
 * remain supported. Defaults come from the selected profile (below).
 */

const DEFAULT_RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';

/*
 * Profiles. HAHAWEEK_PROFILE selects one; default "free".
 *
 * free: sized for the public Robinhood Chain RPC with no API key, a free
 *       GitHub Actions runner, or an Android phone on Termux. Small getLogs
 *       ranges, 2 concurrent header requests, few batches per pass, long
 *       sleeps, patient retries. It does NOT keep up with the chain head
 *       (~10 blocks/s); it ingests a contiguous, authority-checked range at a
 *       polite pace. See ARCHITECTURE.md "Free profile".
 * fast: the previous defaults, for a keyed/paid RPC or a host that must
 *       track the head.
 *
 * Any explicit env var still overrides the profile value.
 */
const PROFILES = Object.freeze({
  free: Object.freeze({
    CHAIN_ID: 4663,
    CONFIRMATIONS: 3,
    POLL_INTERVAL_MS: 5000,
    // 100 blocks ~ 100 PoolManager logs ~ 100 KB per getLogs (probe 2026-10-26).
    CHUNK_SIZE: 100,
    LOG_CHUNK_SIZE: 100,
    // 5 x 100 = 500 blocks per pass (~1.7 MB of RPC responses).
    MAX_BATCHES_PER_RUN: 5,
    MAX_RUNTIME_MS: 15 * 60 * 1000,
    MAX_RPC_CALLS_PER_RUN: 1000,
    // eth_getBlockByNumber answers in ~1.1 s on the public RPC; 2 in flight.
    HEADER_CONCURRENCY: 2,
    RPC_TIMEOUT_MS: 30000,
    RPC_RETRY_MAX_ATTEMPTS: 6,
    RPC_RETRY_BASE_MS: 2000,
    RPC_RETRY_MAX_MS: 60000,
    LOOP_SLEEP_MS: 60000,
    CATCHUP_SLEEP_MS: 15000,
  }),
  fast: Object.freeze({
    CHAIN_ID: 4663,
    CONFIRMATIONS: 3,
    POLL_INTERVAL_MS: 5000,
    // Blocks per verified batch (one processing context + authority + cursor advance).
    CHUNK_SIZE: 500,
    LOG_CHUNK_SIZE: 500,
    // Batches per ingestion pass: 500 x 20 = 10,000 blocks (~17 min of chain time).
    MAX_BATCHES_PER_RUN: 20,
    MAX_RUNTIME_MS: 15 * 60 * 1000,
    MAX_RPC_CALLS_PER_RUN: 4096,
    // Concurrent eth_getBlockByNumber requests while building a canonical snapshot.
    HEADER_CONCURRENCY: 8,
    RPC_TIMEOUT_MS: 15000,
    RPC_RETRY_MAX_ATTEMPTS: 4,
    RPC_RETRY_BASE_MS: 250,
    RPC_RETRY_MAX_MS: 10000,
    LOOP_SLEEP_MS: 5000,
    CATCHUP_SLEEP_MS: 250,
  }),
});

const DEFAULT_PROFILE = 'free';

// Backwards-compatible export: the defaults of the default profile.
const DEFAULTS = PROFILES[DEFAULT_PROFILE];

function readProfile(env) {
  const found = pick(env, ['HAHAWEEK_PROFILE']);
  const name = found ? found.value.toLowerCase() : DEFAULT_PROFILE;
  if (!Object.prototype.hasOwnProperty.call(PROFILES, name)) {
    throw new Error(`INVALID_CONFIG: HAHAWEEK_PROFILE must be one of ${Object.keys(PROFILES).join('|')}`);
  }
  return name;
}

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
  const PROFILE = readProfile(env);
  const P = PROFILES[PROFILE];
  const rpcFound = pick(env, ['HAHAWEEK_RPC_URL', 'RPC_URL']);
  const RPC_URL = rpcFound ? rpcFound.value : DEFAULT_RPC_URL;

  const rpcList = pick(env, ['HAHAWEEK_RPC_URLS', 'RPC_URLS']);
  const RPC_URLS = [...new Set(
    (rpcList ? rpcList.value : RPC_URL)
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
  )];

  const CHUNK_SIZE = readInteger(env, ['HAHAWEEK_CHUNK_SIZE', 'CHUNK_SIZE'], P.CHUNK_SIZE, { min: 1 });

  const startFound = pick(env, ['HAHAWEEK_START_BLOCK']);
  const START_BLOCK = startFound
    ? readInteger(env, ['HAHAWEEK_START_BLOCK'], null, { min: 0 })
    : null;

  return Object.freeze({
    RPC_URL,
    RPC_URLS,
    CHAIN_ID: readInteger(env, ['CHAIN_ID'], P.CHAIN_ID, { min: 1 }),
    CONFIRMATIONS: readInteger(env, ['HAHAWEEK_CONFIRMATIONS', 'CONFIRMATIONS'], P.CONFIRMATIONS),
    POLL_INTERVAL_MS: readInteger(env, ['POLL_INTERVAL_MS'], P.POLL_INTERVAL_MS),
    CHUNK_SIZE,
    // eth_getLogs range per call inside a batch. The public RPC rejects a
    // query matching more than 10,000 logs (~9,000 PoolManager blocks).
    LOG_CHUNK_SIZE: readInteger(
      env,
      ['HAHAWEEK_LOG_CHUNK_SIZE'],
      // An explicit CHUNK_SIZE keeps the old "log range = batch size" behaviour.
      pick(env, ['HAHAWEEK_CHUNK_SIZE', 'CHUNK_SIZE']) ? CHUNK_SIZE : Math.min(P.LOG_CHUNK_SIZE, CHUNK_SIZE),
      { min: 1 }
    ),
    MAX_BATCHES_PER_RUN: readInteger(
      env,
      ['HAHAWEEK_MAX_BATCHES_PER_RUN', 'MAX_BATCHES_PER_RUN'],
      P.MAX_BATCHES_PER_RUN,
      { min: 1 }
    ),
    MAX_RUNTIME_MS: readInteger(env, ['HAHAWEEK_MAX_RUNTIME_MS', 'MAX_RUNTIME_MS'], P.MAX_RUNTIME_MS, { min: 1 }),
    MAX_RPC_CALLS_PER_RUN: readInteger(
      env,
      ['HAHAWEEK_MAX_RPC_CALLS_PER_RUN', 'MAX_RPC_CALLS_PER_RUN'],
      P.MAX_RPC_CALLS_PER_RUN,
      { min: 1 }
    ),
    HEADER_CONCURRENCY: readInteger(env, ['HAHAWEEK_HEADER_CONCURRENCY'], P.HEADER_CONCURRENCY, { min: 1 }),
    // First block to ingest when no cursor exists yet. null = start at the safe head.
    START_BLOCK,
    PROFILE,
    RPC_TIMEOUT_MS: readInteger(env, ['HAHAWEEK_RPC_TIMEOUT_MS', 'RPC_TIMEOUT_MS'], P.RPC_TIMEOUT_MS, { min: 1 }),
    RPC_RETRY_MAX_ATTEMPTS: readInteger(env, ['HAHAWEEK_RPC_RETRY_MAX_ATTEMPTS'], P.RPC_RETRY_MAX_ATTEMPTS, { min: 1 }),
    RPC_RETRY_BASE_MS: readInteger(env, ['HAHAWEEK_RPC_RETRY_BASE_MS'], P.RPC_RETRY_BASE_MS),
    RPC_RETRY_MAX_MS: readRetryMax(env, P),
    // Runner (src/runner.js) sleeps.
    LOOP_SLEEP_MS: readInteger(env, ['HAHAWEEK_LOOP_SLEEP_MS', 'RUNNER_INTERVAL_MS'], P.LOOP_SLEEP_MS),
    CATCHUP_SLEEP_MS: readInteger(env, ['HAHAWEEK_CATCHUP_SLEEP_MS'], P.CATCHUP_SLEEP_MS),
  });
}

function readRetryMax(env, P) {
  const base = readInteger(env, ['HAHAWEEK_RPC_RETRY_BASE_MS'], P.RPC_RETRY_BASE_MS);
  const max = readInteger(env, ['HAHAWEEK_RPC_RETRY_MAX_MS'], Math.max(P.RPC_RETRY_MAX_MS, base));
  if (max < base) {
    throw new Error('INVALID_CONFIG: HAHAWEEK_RPC_RETRY_MAX_MS must be >= HAHAWEEK_RPC_RETRY_BASE_MS');
  }
  return max;
}

const config = readConfig();

module.exports = {
  ...config,
  DEFAULT_RPC_URL,
  DEFAULTS,
  DEFAULT_PROFILE,
  PROFILES,
  readConfig,
};
