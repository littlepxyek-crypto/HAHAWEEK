'use strict';

const RPC_URL =
  process.env.RPC_URL ||
  'https://rpc.mainnet.chain.robinhood.com';

const RPC_URLS = [...new Set(
  (process.env.RPC_URLS || RPC_URL)
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
)];

const CHAIN_ID = Number(process.env.CHAIN_ID || 4663);
const CONFIRMATIONS = Number(process.env.CONFIRMATIONS || 3);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 5000);
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE || 10);
const MAX_BATCHES_PER_RUN = Number(process.env.MAX_BATCHES_PER_RUN || 10);
const MAX_RUNTIME_MS = Number(process.env.MAX_RUNTIME_MS || 15 * 60 * 1000);
const MAX_RPC_CALLS_PER_RUN = Number(process.env.MAX_RPC_CALLS_PER_RUN || 4096);

module.exports = {
  RPC_URL,
  RPC_URLS,
  CHAIN_ID,
  CONFIRMATIONS,
  POLL_INTERVAL_MS,
  CHUNK_SIZE,
  MAX_BATCHES_PER_RUN,
  MAX_RUNTIME_MS,
  MAX_RPC_CALLS_PER_RUN,
};
