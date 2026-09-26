'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { persistOperationalFailure } = require('../src/core/operational-failure-persistence');

test('operational failure persistence records failure behind writer fence', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-operational-state-'));
  const stateFile = path.join(dir, 'state.json');
  const fenceFile = path.join(dir, 'writer-fence.json');

  try {
    process.env.HAHAWEEK_DATA_DIR = dir;
    process.env.HAHAWEEK_STATE_FILE = stateFile;

    const failure = persistOperationalFailure(
      Object.assign(new Error('TIMEOUT'), { code: 'TIMEOUT' }),
      {
        writerFenceFile: fenceFile,
        ownerId: 'test-operational-state',
      }
    );

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

    assert.equal(failure.failure_class, 'PROVIDER_UNAVAILABLE');
    assert.equal(state.operationalState, 'DEGRADED');
    assert.equal(state.failure.failure_class, 'PROVIDER_UNAVAILABLE');
    assert.equal(state.failure.failure_code, 'TIMEOUT');
    assert.equal(state.recovery.required, false);
  } finally {
    delete process.env.HAHAWEEK_DATA_DIR;
    delete process.env.HAHAWEEK_STATE_FILE;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
