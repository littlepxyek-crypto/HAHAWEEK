'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_LEASE_MS = Number(process.env.HAHAWEEK_WRITER_LEASE_MS || 30_000);
const LOCK_SUFFIX = '.lock';

const DEFAULT_STATE_FILE =
  process.env.HAHAWEEK_WRITER_FENCE_FILE ||
  path.join(
    process.env.HAHAWEEK_DATA_DIR || path.join(process.cwd(), 'data'),
    'writer-fence-state.json'
  );

class WriterFenceError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = 'WriterFenceError';
    this.code = code;
  }
}

function parseState(filename) {
  if (!fs.existsSync(filename)) return null;

  let state;
  try {
    state = JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch {
    throw new WriterFenceError('MALFORMED_WRITER_FENCE_STATE');
  }

  if (
    !state ||
    typeof state.ownerId !== 'string' ||
    !Number.isInteger(state.fence) ||
    state.fence < 1 ||
    !Number.isInteger(state.expiresAt) ||
    state.expiresAt < 0
  ) {
    throw new WriterFenceError('INVALID_WRITER_FENCE_STATE');
  }

  return state;
}

function withFileLock(filename, fn) {
  const lockFile = filename + LOCK_SUFFIX;
  let handle;
  try {
    handle = fs.openSync(lockFile, 'wx');
  } catch (error) {
    if (error && error.code === 'EEXIST') {
      throw new WriterFenceError('WRITER_FENCE_BUSY');
    }
    throw error;
  }

  try {
    return fn();
  } finally {
    fs.closeSync(handle);
    fs.unlinkSync(lockFile);
  }
}

function atomicWrite(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const tmp = filename + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value) + '\n', 'utf8');
  fs.renameSync(tmp, filename);
}

function createWriterFence(options = {}) {
  const filename = options.filename || DEFAULT_STATE_FILE;
  const leaseMs = Number(options.leaseMs || DEFAULT_LEASE_MS);
  const ownerId = options.ownerId || crypto.randomUUID();
  const now = options.now || (() => Date.now());

  if (!Number.isFinite(leaseMs) || leaseMs <= 0) {
    throw new WriterFenceError('INVALID_WRITER_LEASE');
  }

  let acquiredFence = null;

  function acquire() {
    return withFileLock(filename, () => {
      const current = parseState(filename);
      const timestamp = now();

      if (current && current.expiresAt > timestamp && current.ownerId !== ownerId) {
        throw new WriterFenceError('WRITER_FENCE_HELD');
      }

      const fence = current ? current.fence + 1 : 1;
      const expiresAt = timestamp + leaseMs;
      atomicWrite(filename, {
        version: 1,
        ownerId,
        fence,
        expiresAt,
      });
      acquiredFence = fence;
      return { ownerId, fence, expiresAt };
    });
  }

  function assertOwned() {
    const current = parseState(filename);
    const timestamp = now();

    if (!current) {
      throw new WriterFenceError('WRITER_FENCE_MISSING');
    }

    if (current.ownerId !== ownerId || current.fence !== acquiredFence) {
      throw new WriterFenceError('STALE_WRITER_FENCE');
    }

    if (current.expiresAt <= timestamp) {
      throw new WriterFenceError('WRITER_FENCE_EXPIRED');
    }

    return true;
  }

  function renew() {
    assertOwned();
    return withFileLock(filename, () => {
      const timestamp = now();
      const current = parseState(filename);
      const expiresAt = timestamp + leaseMs;
      atomicWrite(filename, {
        ...current,
        expiresAt,
      });
      return { ...current, expiresAt };
    });
  }

  function release() {
    const current = parseState(filename);
    if (!current) return false;
    if (current.ownerId !== ownerId || current.fence !== acquiredFence) return false;
    return withFileLock(filename, () => {
      const latest = parseState(filename);
      if (latest.ownerId !== ownerId || latest.fence !== acquiredFence) return false;
      atomicWrite(filename, {
        version: 1,
        ownerId: 'NONE',
        fence: latest.fence,
        expiresAt: 0,
      });
      acquiredFence = null;
      return true;
    });
  }

  return {
    ownerId,
    acquire,
    assertOwned,
    renew,
    release,
    getState: () => parseState(filename),
  };
}

module.exports = {
  DEFAULT_LEASE_MS,
  DEFAULT_STATE_FILE,
  WriterFenceError,
  createWriterFence,
};
