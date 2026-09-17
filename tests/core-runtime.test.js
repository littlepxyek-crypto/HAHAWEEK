'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TEST_DATA_DIR = fs.mkdtempSync(
  path.join(os.tmpdir(), 'hahaweek-core-runtime-')
);

process.env.HAHAWEEK_DATA_DIR = TEST_DATA_DIR;
process.env.HAHAWEEK_STATE_FILE = path.join(TEST_DATA_DIR, 'state.json');
process.env.HAHAWEEK_RAW_FILE = path.join(TEST_DATA_DIR, 'raw-events.jsonl');


const {
  loadState,
  saveState,
  STATE_FILE,
} = require('../src/core/state');

const {
  eventId,
  appendUnique,
  RAW_FILE,
} = require('../src/core/raw-store');

test('state persistence survives reload', () => {
  const state = {
    version: 1,
    lastProcessedBlock: 12345,
    status: 'RUNNING',
    lastError: null,
  };

  saveState(state);

  const loaded = loadState();

  assert.equal(loaded.version, 1);
  assert.equal(loaded.lastProcessedBlock, 12345);
  assert.equal(loaded.status, 'RUNNING');

  fs.rmSync(STATE_FILE, { force: true });
});

test('event ID is deterministic', () => {
  const log = {
    blockNumber: 100,
    transactionHash: '0xabc',
    index: 7,
  };

  const a = eventId(log, 4663);
  const b = eventId(log, 4663);

  assert.equal(a, b);
  assert.equal(a, '4663:100:0xabc:7');
});

test('duplicate raw event is not inserted twice', () => {
  fs.rmSync(RAW_FILE, { force: true });

  const log = {
    blockNumber: 200,
    transactionHash: '0xdef',
    index: 3,
    address: '0x123',
    topics: ['0xtopic'],
    data: '0xdata',
  };

  const first = appendUnique(log, 4663);
  const second = appendUnique(log, 4663);

  assert.equal(first.inserted, true);
  assert.equal(second.inserted, false);

  const lines = fs
    .readFileSync(RAW_FILE, 'utf8')
    .trim()
    .split('\n');

  assert.equal(lines.length, 1);

  fs.rmSync(RAW_FILE, { force: true });
  fs.rmSync(STATE_FILE, { force: true });
});
