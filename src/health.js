'use strict';

const { getRpcStatus } = require('./core/rpc');
const { loadState } = require('./core/state');
const { readOperationalState } = require('./core/operational-state');
const { persistOperationalFailure } = require('./core/operational-failure-persistence');

async function runHealth(
  getStatus = getRpcStatus,
  output = console.log,
  getState = loadState
) {
  const status = await getStatus();
  const state = readOperationalState(getState());
  const operationalState = state.operationalState || 'UNKNOWN';

  output(`RPC: ${status.rpcUrl}`);
  output(`Expected Chain ID: ${status.expectedChainId}`);
  output(`Actual Chain ID: ${status.actualChainId}`);
  output(`Current Block: ${status.blockNumber}`);
  output(`Operational state: ${operationalState}`);

  if (operationalState === 'HEALTHY') {
    output('HEALTH: OK');
  } else {
    output(`HEALTH: NOT READY (${operationalState})`);
  }

  return {
    ...status,
    operationalState,
  };
}

async function main() {
  try {
    await runHealth();
  } catch (error) {
    console.error('HEALTH: FAILED');
    console.error(error.message);

    try {
      persistOperationalFailure(error);
    } catch (stateError) {
      console.error('HEALTH STATE: FAILED');
      console.error(
        stateError instanceof Error
          ? stateError.message
          : String(stateError)
      );
    }

    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runHealth,
};
