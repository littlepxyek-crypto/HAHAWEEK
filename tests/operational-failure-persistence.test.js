'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { persistOperationalFailure } = require('../src/core/operational-failure-persistence');

test('operational failure persistence recovers when the previous writer fence is expired', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-operational-state-expired-'));
  const stateFile = path.join(dir, 'state.json');
  const fenceFile = path.join(dir, 'writer-fence.json');

  try {
    const { createWriterFence } = require('../src/core/single-writer-fence');
    const oldWriter = createWriterFence({
      filename: fenceFile,
      ownerId: 'expired-writer',
      leaseMs: 50,
    });
    oldWriter.acquire();

    const firstState = {
      version: 1,
      lastProcessedBlock: 123,
      lastVerifiedCursor: 123,
      status: 'RUNNING',
      operationalState: 'INITIALIZING',
      failure: null,
      recovery: { state: 'NOT_REQUIRED', required: false },
    };
    fs.writeFileSync(stateFile, JSON.stringify(firstState) + '\n', 'utf8');

    const expired = JSON.parse(fs.readFileSync(fenceFile, 'utf8'));
    fs.writeFileSync(
      fenceFile,
      JSON.stringify({ ...expired, expiresAt: Date.now() - 1 }) + '\n',
      'utf8'
    );

    const failure = persistOperationalFailure(
      Object.assign(new Error('WRITER_FENCE_EXPIRED'), { code: 'WRITER_FENCE_EXPIRED' }),
      {
        writerFenceFile: fenceFile,
        stateFile,
        ownerId: 'replacement-writer',
      }
    );

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const fence = JSON.parse(fs.readFileSync(fenceFile, 'utf8'));

    assert.equal(failure.failure_class, 'WRITER_FENCE_FAILURE');
    assert.equal(state.status, 'FAILED');
    assert.equal(state.operationalState, 'BLOCKED');
    assert.equal(state.failure.failure_code, 'WRITER_FENCE_EXPIRED');
    assert.equal(state.lastVerifiedCursor, 123);
    assert.ok(fence.fence > expired.fence);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});


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
        stateFile,
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
