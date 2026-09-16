'use strict';

const { ethers } = require('ethers');
const {
  RPC_URL,
  CHAIN_ID,
} = require('./core/config');

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();

  const actualChainId = Number(network.chainId);

  console.log(`RPC: ${RPC_URL}`);
  console.log(`Expected Chain ID: ${CHAIN_ID}`);
  console.log(`Actual Chain ID: ${actualChainId}`);
  console.log(`Current Block: ${blockNumber}`);

  if (actualChainId !== CHAIN_ID) {
    throw new Error(
      `CHAIN_ID_MISMATCH: expected ${CHAIN_ID}, got ${actualChainId}`
    );
  }

  console.log('HEALTH: OK');
}

main().catch((error) => {
  console.error('HEALTH: FAILED');
  console.error(error.message);
  process.exitCode = 1;
});
