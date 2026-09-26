'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'hahaweek');

function runStatus(state) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-status-'));
  try {
    fs.writeFileSync(
      path.join(dir, 'state.json'),
      JSON.stringify(state, null, 2) + '\n'
    );

    return spawnSync(
      'bash',
      [CLI, 'status'],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          HAHAWEEK_DATA_DIR: dir,
        },
        encoding: 'utf8',
      }
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('status command returns zero for valid operational state', () => {
  const result = runStatus({
    version: 1,
    lastProcessedBlock: 100,
    lastVerifiedCursor: 100,
    operationalState: 'HEALTHY',
    failure: null,
    recovery: {
      state: 'VERIFIED',
      required: false,
    },
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Operational state: HEALTHY/);
  assert.match(result.stdout, /STOP: no blocking operational state/);
});

test('status command propagates malformed operational state as non-zero', () => {
  const result = runStatus({
    version: 1,
    lastProcessedBlock: 100,
    operationalState: 'NOT_A_VALID_STATE',
    failure: null,
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /HAHAWEEK STATUS: FAILED/);
});

test('status command preserves explicit fail-closed STOP output', () => {
  const result = runStatus({
    version: 1,
    lastProcessedBlock: 100,
    lastVerifiedCursor: 100,
    operationalState: 'BLOCKED',
    failure: {
      failure_class: 'AUTHORITY_MISMATCH',
      failure_code: 'AUTHORITY_RANGE_MISMATCH',
      boundary: 'RUNTIME',
      recoverability: 'STOP',
      retry_policy: 'STOP',
      operational_state: 'BLOCKED',
      evidence_impact: 'PRESERVE',
      authority_impact: 'NO_ADVANCE',
      recovery_required: true,
    },
    recovery: {
      state: 'REQUIRED',
      required: true,
    },
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /STOP: FAIL-CLOSED/);
  assert.match(result.stdout, /Failure class: AUTHORITY_MISMATCH/);
});
