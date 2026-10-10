'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { readStateSnapshot } = require('../src/observability/read-model');
const { renderSnapshot } = require('../src/observability/console');

function tempPath(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-observe-'));
  return path.join(dir, name);
}

test('missing state returns UNKNOWN without creating a directory or file', () => {
  const stateFile = path.join(os.tmpdir(), 'hahaweek-observe-missing-parent', 'state.json');
  const snapshot = readStateSnapshot({
    stateFile,
    now: () => '2026-01-01T00:00:00.000Z',
  });

  assert.equal(snapshot.sourceState, 'MISSING');
  assert.equal(snapshot.operationalState, 'UNKNOWN');
  assert.equal(snapshot.processLiveness, 'UNKNOWN');
  assert.equal(fs.existsSync(path.dirname(stateFile)), false);
  assert.equal(fs.existsSync(stateFile), false);
});

test('valid state exposes distinct processed and verified cursors without changing bytes', () => {
  const stateFile = tempPath('state.json');
  const source = JSON.stringify({
    version: 1,
    status: 'HEALTHY',
    operationalState: 'HEALTHY',
    lastProcessedBlock: 101,
    lastVerifiedCursor: 100,
    updatedAt: '2026-01-01T00:00:00.000Z',
    failure: null,
  });
  fs.writeFileSync(stateFile, source);
  const before = fs.readFileSync(stateFile, 'utf8');

  const snapshot = readStateSnapshot({ stateFile, now: () => '2026-01-02T00:00:00.000Z' });

  assert.equal(snapshot.sourceState, 'AVAILABLE');
  assert.equal(snapshot.operationalState, 'HEALTHY');
  assert.equal(snapshot.lastProcessedBlock, 101);
  assert.equal(snapshot.lastVerifiedCursor, 100);
  assert.equal(snapshot.processLiveness, 'UNKNOWN');
  assert.equal(snapshot.freshnessStatus, 'STALE');
  assert.equal(fs.readFileSync(stateFile, 'utf8'), before);
});

test('malformed JSON fails closed and does not expose raw contents', () => {
  const stateFile = tempPath('state.json');
  fs.writeFileSync(stateFile, '{"secret":"do-not-display"');
  const snapshot = readStateSnapshot({ stateFile });

  assert.equal(snapshot.sourceState, 'MALFORMED');
  assert.equal(snapshot.operationalState, 'UNKNOWN');
  assert.equal(JSON.stringify(snapshot).includes('do-not-display'), false);
});

test('invalid operational state fails closed', () => {
  const stateFile = tempPath('state.json');
  fs.writeFileSync(stateFile, JSON.stringify({
    operationalState: 'NOT_A_REAL_STATE',
    lastProcessedBlock: 200,
  }));
  const snapshot = readStateSnapshot({ stateFile });

  assert.equal(snapshot.sourceState, 'MALFORMED');
  assert.equal(snapshot.operationalState, 'UNKNOWN');
  assert.equal(snapshot.lastProcessedBlock, null);
});

test('legacy status is displayed only when it matches canonical vocabulary', () => {
  const stateFile = tempPath('state.json');
  fs.writeFileSync(stateFile, JSON.stringify({
    status: 'FAILED',
    lastProcessedBlock: 9,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }));
  const snapshot = readStateSnapshot({ stateFile, now: () => '2026-01-01T00:00:01.000Z' });

  assert.equal(snapshot.sourceState, 'AVAILABLE');
  assert.equal(snapshot.operationalState, 'FAILED');
  assert.equal(snapshot.freshnessStatus, 'FRESH');
});

test('terminal tree labels liveness unknown and renders no secrets', () => {
  const lines = [];
  renderSnapshot({
    source: '/tmp/state.json',
    sampledAt: '2026-01-01T00:00:00.000Z',
    sourceState: 'AVAILABLE',
    operationalState: 'DEGRADED',
    sourceUpdatedAt: null,
    lastProcessedBlock: 12,
    lastVerifiedCursor: 11,
    failure: null,
    errorCode: null,
    processLiveness: 'UNKNOWN',
    note: 'sample only',
  }, line => lines.push(line));

  assert.ok(lines.some(line => line.includes('Process liveness: UNKNOWN')));
  assert.ok(lines.some(line => line.includes('Last processed block: 12')));
  assert.ok(lines.some(line => line.includes('Last verified cursor: 11')));
});

test('freshness is UNKNOWN when timestamp is absent, invalid, or in the future', () => {
  const stateFile = tempPath('state.json');
  fs.writeFileSync(stateFile, JSON.stringify({ operationalState: 'HEALTHY' }));
  const missing = readStateSnapshot({ stateFile, now: () => '2026-01-01T00:00:00.000Z' });
  assert.equal(missing.freshnessStatus, 'UNKNOWN');

  fs.writeFileSync(stateFile, JSON.stringify({ operationalState: 'HEALTHY', updatedAt: 'not-a-timestamp' }));
  const invalid = readStateSnapshot({ stateFile, now: () => '2026-01-01T00:00:00.000Z' });
  assert.equal(invalid.freshnessStatus, 'UNKNOWN');

  fs.writeFileSync(stateFile, JSON.stringify({ operationalState: 'HEALTHY', updatedAt: '2026-01-02T00:00:00.000Z' }));
  const future = readStateSnapshot({ stateFile, now: () => '2026-01-01T00:00:00.000Z' });
  assert.equal(future.freshnessStatus, 'UNKNOWN');
});

test('invalid freshness threshold fails closed without changing operational state', () => {
  const stateFile = tempPath('state.json');
  fs.writeFileSync(stateFile, JSON.stringify({ operationalState: 'HEALTHY', updatedAt: '2026-01-01T00:00:00.000Z' }));
  const snapshot = readStateSnapshot({
    stateFile,
    now: () => '2026-01-01T00:00:01.000Z',
    staleAfterMs: 999,
  });
  assert.equal(snapshot.operationalState, 'HEALTHY');
  assert.equal(snapshot.freshnessStatus, 'UNKNOWN');
});
