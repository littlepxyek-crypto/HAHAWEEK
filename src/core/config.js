'use strict';

const RPC_URL =
  process.env.RPC_URL ||
  'https://rpc.mainnet.chain.robinhood.com';

const CHAIN_ID = Number(process.env.CHAIN_ID || 4663);

const CONFIRMATIONS = Number(process.env.CONFIRMATIONS || 3);

const POLL_INTERVAL_MS = Number(
  process.env.POLL_INTERVAL_MS || 5000
);

const CHUNK_SIZE = Number(
  process.env.CHUNK_SIZE || 10
);

const MAX_BATCHES_PER_RUN = Number(
  process.env.MAX_BATCHES_PER_RUN || 10
);

module.exports = {
  RPC_URL,
  CHAIN_ID,
  CONFIRMATIONS,
  POLL_INTERVAL_MS,
  CHUNK_SIZE,
  MAX_BATCHES_PER_RUN,
};
