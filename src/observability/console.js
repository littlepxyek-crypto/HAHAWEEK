'use strict';

const { readStateSnapshot } = require('./read-model');

function renderSnapshot(snapshot, output = console.log) {
  output('HAHAWEEK — OBSERVABILITY TREE');
  output('Read-only snapshot · no runtime controls');
  output('');
  output('Runtime Supervisor');
  output('  ├─ State reader');
  output(`  │   ├─ Source: ${snapshot.source}`);
  output(`  │   ├─ Read result: ${snapshot.sourceState}`);
  output(`  │   └─ Sampled at: ${snapshot.sampledAt}`);
  output('  ├─ Operational state');
  output(`  │   ├─ State: ${snapshot.operationalState}`);
  output(`  │   ├─ Last processed block: ${snapshot.lastProcessedBlock === null ? 'UNKNOWN' : snapshot.lastProcessedBlock}`);
  output(`  │   ├─ Last verified cursor: ${snapshot.lastVerifiedCursor === null ? 'UNKNOWN' : snapshot.lastVerifiedCursor}`);
  output(`  │   ├─ Source updated at: ${snapshot.sourceUpdatedAt || 'UNKNOWN'}`);
  output(`  │   └─ Source freshness: ${snapshot.freshnessStatus || 'UNKNOWN'}${Number.isSafeInteger(snapshot.sourceAgeMs) ? ` (${snapshot.sourceAgeMs}ms old)` : ''}`);
  output('  ├─ Failure details');
  output(`  │   ├─ Class: ${snapshot.failure?.failure_class || 'NONE / UNKNOWN'}`);
  output(`  │   ├─ Code: ${snapshot.failure?.failure_code || snapshot.errorCode || 'NONE / UNKNOWN'}`);
  output(`  │   └─ Recovery disposition: ${snapshot.failure?.recoverability || 'UNKNOWN'}`);
  output('  └─ Process liveness: UNKNOWN (not probed by this read-only command)');
  output('');
  output(`Note: ${snapshot.note}`);
  output('No cursor, checkpoint, evidence, or operational state was modified by this command.');
}

function main() {
  const snapshot = readStateSnapshot();
  renderSnapshot(snapshot);
  if (snapshot.sourceState === 'MALFORMED' || snapshot.sourceState === 'UNAVAILABLE') {
    process.exitCode = 2;
  }
}

if (require.main === module) main();

module.exports = {
  renderSnapshot,
  main,
};
