'use strict';

const fs = require('fs');
const path = require('path');
const { createLegacyWriteBarrier } = require('./legacy-write-freeze');

const STATE_DIR = process.env.HAHAWEEK_DATA_DIR || path.join(process.cwd(), 'data');
const STATE_FILE = process.env.HAHAWEEK_STATE_FILE || path.join(STATE_DIR, 'state.json');

function ensureDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

function loadState() {
  ensureDir();

  if (!fs.existsSync(STATE_FILE)) {
    return {
      version: 1,
      lastProcessedBlock: null,
      status: 'INITIALIZING',
      lastError: null,
      updatedAt: null,
    };
  }

  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state, options = {}) {
  const legacyWriteBarrier =
    options.legacyWriteBarrier || createLegacyWriteBarrier();

  legacyWriteBarrier.assertWritable();
  ensureDir();

  const tmp = STATE_FILE + '.tmp';

  fs.writeFileSync(
    tmp,
    JSON.stringify(
      {
        ...state,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    ) + '\n'
  );

  fs.renameSync(tmp, STATE_FILE);
}

module.exports = {
  STATE_FILE,
  loadState,
  saveState,
};
