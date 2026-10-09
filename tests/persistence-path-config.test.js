'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

test('database and state paths honor the configured HAHAWEEK data directory', () => {
  const root = path.join(os.tmpdir(), 'hahaweek-path-contract');
  const expectedDataDir = path.join(root, 'data');
  const expectedStateFile = path.join(expectedDataDir, 'state.json');
  const expectedDatabaseFile = path.join(expectedDataDir, 'hahaweek.sqlite');

  const script = [
    "const state = require('./src/core/state');",
    "const database = require('./src/core/database');",
    "process.stdout.write(JSON.stringify({ stateFile: state.STATE_FILE, databaseFile: database.DB_FILE }));",
  ].join('\n');

  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      HAHAWEEK_DATA_DIR: expectedDataDir,
      HAHAWEEK_STATE_FILE: '',
      HAHAWEEK_DB_FILE: '',
    },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    stateFile: expectedStateFile,
    databaseFile: expectedDatabaseFile,
  });
});

test('explicit database and state file overrides remain independent and respected', () => {
  const root = path.join(os.tmpdir(), 'hahaweek-explicit-path-contract');
  const expectedStateFile = path.join(root, 'state', 'custom-state.json');
  const expectedDatabaseFile = path.join(root, 'database', 'custom.sqlite');

  const script = [
    "const state = require('./src/core/state');",
    "const database = require('./src/core/database');",
    "process.stdout.write(JSON.stringify({ stateFile: state.STATE_FILE, databaseFile: database.DB_FILE }));",
  ].join('\n');

  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      HAHAWEEK_DATA_DIR: path.join(root, 'data'),
      HAHAWEEK_STATE_FILE: expectedStateFile,
      HAHAWEEK_DB_FILE: expectedDatabaseFile,
    },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    stateFile: expectedStateFile,
    databaseFile: expectedDatabaseFile,
  });
});
