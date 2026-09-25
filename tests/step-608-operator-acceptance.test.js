'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'hahaweek');

function runCli(args) {
  return spawnSync('bash', [CLI, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

test('operator CLI help exposes repository-supported operations', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /hahaweek status/);
  assert.match(result.stdout, /hahaweek test/);
  assert.match(result.stdout, /hahaweek health/);
  assert.match(result.stdout, /hahaweek scan/);
  assert.match(result.stdout, /hahaweek start/);
  assert.match(result.stdout, /hahaweek repair/);
});

test('operator CLI rejects unknown commands without mutating state', () => {
  const result = runCli(['__unknown_operator_command__']);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /HAHAWEEK Automation CLI/);
  assert.match(result.stderr, /^$/);
});

test('operator status is repository-grounded and read-oriented', () => {
  const result = runCli(['status']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /=== HAHAWEEK STATUS ===/);
  assert.match(result.stdout, /Node:/);
  assert.match(result.stdout, /npm:/);
  assert.match(result.stdout, /Git HEAD:/);
  assert.match(result.stdout, /Git branch:/);
});

test('health reports successful injected status deterministically', async () => {
  const { runHealth } = require('../src/health');

  const lines = [];
  const status = {
    rpcUrl: 'test://rpc',
    expectedChainId: 4663,
    actualChainId: 4663,
    blockNumber: 123,
  };

  const result = await runHealth(async () => status, line => lines.push(line));

  assert.deepEqual(result, status);
  assert.deepEqual(lines, [
    'RPC: test://rpc',
    'Expected Chain ID: 4663',
    'Actual Chain ID: 4663',
    'Current Block: 123',
    'HEALTH: OK',
  ]);
});

test('health propagates failure for operator fail-closed recognition', async () => {
  const { runHealth } = require('../src/health');

  await assert.rejects(
    runHealth(async () => {
      throw new Error('RPC_UNAVAILABLE');
    }, () => {}),
    /RPC_UNAVAILABLE/
  );
});

test('state persistence preserves cursor value without reset', () => {
  const { saveState } = require('../src/core/state');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-step-608-'));
  const stateFile = path.join(dir, 'state.json');

  saveState({
    version: 1,
    lastProcessedBlock: 12345,
    status: 'RUNNING',
    lastError: null,
  }, { stateFile });

  const persisted = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

  assert.equal(persisted.lastProcessedBlock, 12345);
  assert.equal(persisted.status, 'RUNNING');
  assert.equal(persisted.lastError, null);

  fs.rmSync(dir, { recursive: true, force: true });
});
