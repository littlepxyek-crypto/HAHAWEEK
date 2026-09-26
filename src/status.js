'use strict';

const { loadState } = require('./core/state');
const { readOperationalState } = require('./core/operational-state');

function runStatus(output = console.log, getState = loadState) {
  const state = readOperationalState(getState());
  const operationalState = state.operationalState || 'UNKNOWN';

  output('=== HAHAWEEK OPERATIONAL STATUS ===');
  output(`Operational state: ${operationalState}`);
  output(`Cursor: ${Number.isInteger(state.lastProcessedBlock) ? state.lastProcessedBlock : 'UNKNOWN'}`);
  output(`Last verified cursor: ${Number.isInteger(state.lastVerifiedCursor) ? state.lastVerifiedCursor : 'UNKNOWN'}`);

  if (state.failure) {
    output(`Failure class: ${state.failure.failure_class}`);
    output(`Failure code: ${state.failure.failure_code}`);
    output(`Failure boundary: ${state.failure.boundary}`);
    output(`Recoverability: ${state.failure.recoverability}`);
    output(`Evidence impact: ${state.failure.evidence_impact}`);
    output(`Authority impact: ${state.failure.authority_impact}`);
    output(`Recovery required: ${state.failure.recovery_required}`);
  } else {
    output('Failure: NONE');
  }

  if (state.recovery) {
    output(`Recovery state: ${state.recovery.state}`);
    output(`Recovery required: ${state.recovery.required}`);
  } else {
    output('Recovery state: UNKNOWN');
  }

  if (['BLOCKED', 'FAILED', 'UNKNOWN'].includes(operationalState)) {
    output('STOP: FAIL-CLOSED');
  } else {
    output('STOP: no blocking operational state');
  }

  return state;
}

function main() {
  try {
    runStatus();
  } catch (error) {
    console.error('HAHAWEEK STATUS: FAILED');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runStatus,
};
