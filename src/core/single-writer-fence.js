'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_LEASE_MS = Number(process.env.HAHAWEEK_WRITER_LEASE_MS || 30_000);
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
    const current = parseState(filename);
    const timestamp = now();

    if (current && current.expiresAt > timestamp && current.ownerId !== ownerId) {
      throw new WriterFenceError('WRITER_FENCE_HELD');
    }

    const fence = current ? current.fence + 1 : 1;
    atomicWrite(filename, {
      version: 1,
      ownerId,
      fence,
      expiresAt: timestamp + leaseMs,
    });
    acquiredFence = fence;
    return { ownerId, fence, expiresAt: timestamp + leaseMs };
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
    const timestamp = now();
    const current = parseState(filename);
    atomicWrite(filename, {
      ...current,
      expiresAt: timestamp + leaseMs,
    });
    return { ...current, expiresAt: timestamp + leaseMs };
  }

  function release() {
    const current = parseState(filename);
    if (!current) return false;
    if (current.ownerId !== ownerId || current.fence !== acquiredFence) return false;
    atomicWrite(filename, {
      version: 1,
      ownerId: '',
      fence: current.fence,
      expiresAt: 0,
    });
    acquiredFence = null;
    return true;
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
