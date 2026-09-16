'use strict';

const { ethers } = require('ethers');

const {
  RPC_URL,
  CHAIN_ID,
} = require('./config');

const RPC_TIMEOUT_MS = Number(
  process.env.RPC_TIMEOUT_MS || 15000
);

function createProvider() {
  const request = new ethers.FetchRequest(RPC_URL);

  request.timeout = RPC_TIMEOUT_MS;

  const network = ethers.Network.from({
    name: 'robinhood-mainnet',
    chainId: CHAIN_ID,
  });

  return new ethers.JsonRpcProvider(
    request,
    network,
    {
      batchMaxCount: 1,
    }
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
      rpcUrl: RPC_URL,
      expectedChainId: CHAIN_ID,
      actualChainId,
      blockNumber,
    };
  } finally {
    provider.destroy();
  }
}

module.exports = {
  RPC_TIMEOUT_MS,
  createProvider,
  getRpcStatus,
};
