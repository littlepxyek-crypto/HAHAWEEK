'use strict';

const { getRpcStatus } = require('./core/rpc');

async function runHealth(
  getStatus = getRpcStatus,
  output = console.log
) {
  const status = await getStatus();

  output(`RPC: ${status.rpcUrl}`);
  output(`Expected Chain ID: ${status.expectedChainId}`);
  output(`Actual Chain ID: ${status.actualChainId}`);
  output(`Current Block: ${status.blockNumber}`);
  output('HEALTH: OK');

  return status;
}

async function main() {
  try {
    await runHealth();
  } catch (error) {
    console.error('HEALTH: FAILED');
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runHealth,
};
