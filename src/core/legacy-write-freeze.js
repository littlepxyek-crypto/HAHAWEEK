'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_STATE = 'LEGACY_ACTIVE';
const FROZEN_STATE = 'LEGACY_FROZEN';
const FREEZE_FILE =
  process.env.HAHAWEEK_LEGACY_FREEZE_FILE ||
  path.join(
    process.env.HAHAWEEK_DATA_DIR || path.join(process.cwd(), 'data'),
    'legacy-write-state.json'
  );

class LegacyWriteFreezeError extends Error {
  constructor(code = 'LEGACY_WRITES_FROZEN') {
    super(code);
    this.name = 'LegacyWriteFreezeError';
    this.code = code;
  }
}

function validateState(value) {
  if (value !== DEFAULT_STATE && value !== FROZEN_STATE) {
    throw new LegacyWriteFreezeError('INVALID_LEGACY_WRITE_STATE');
  }
  return value;
}

function readPersistentState(filename = FREEZE_FILE) {
  if (!fs.existsSync(filename)) return DEFAULT_STATE;

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch {
    throw new LegacyWriteFreezeError('MALFORMED_LEGACY_WRITE_STATE');
  }

  return validateState(parsed && parsed.state);
}

function createLegacyWriteBarrier(options = {}) {
  const filename = options.filename || FREEZE_FILE;
  const readState = options.readState || (() => readPersistentState(filename));

  return {
    getState() {
    return validateState(readState());
    },

    assertWritable() {
      const state = validateState(readState());
      if (state === FROZEN_STATE) throw new LegacyWriteFreezeError();

      if (options.writerFence) {
        options.writerFence.assertOwned();
      }

      return true;
    },

    freeze() {
      const current = validateState(readState());
      if (current === FROZEN_STATE) return FROZEN_STATE;

      fs.mkdirSync(path.dirname(filename), { recursive: true });
      const tmp = filename + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify({ state: FROZEN_STATE }) + '\n');
      fs.renameSync(tmp, filename);
      return FROZEN_STATE;
    },
  };
}

module.exports = {
  DEFAULT_STATE,
  FROZEN_STATE,
  FREEZE_FILE,
  LegacyWriteFreezeError,
  createLegacyWriteBarrier,
};
