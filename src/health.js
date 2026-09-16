'use strict';

const { getRpcStatus } = require('./core/rpc');

async function main() {
  const status = await getRpcStatus();

  console.log(`RPC: ${status.rpcUrl}`);
  console.log(`Expected Chain ID: ${status.expectedChainId}`);
  console.log(`Actual Chain ID: ${status.actualChainId}`);
  console.log(`Current Block: ${status.blockNumber}`);
  console.log('HEALTH: OK');
}

main().catch((error) => {
  console.error('HEALTH: FAILED');
  console.error(error.message);
  process.exitCode = 1;
});
