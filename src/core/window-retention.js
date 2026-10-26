'use strict';

/*
 * Evidence epochs (retention for window-watch mode).
 *
 * Evidence tables are append-only (SQL triggers), so old rows are never
 * deleted from a live DB. Instead the WHOLE evidence data directory (sqlite,
 * raw-events.jsonl, state.json with the cursor, writer fence) is an "epoch".
 * When the current epoch is older than maxAgeMs or larger than maxBytes, a
 * new, empty epoch is started and the oldest epochs beyond keepOld are
 * deleted as a whole. Nothing inside an epoch is ever modified or pruned.
 *
 * Layout under the root data dir:
 *   epoch.json            { version, current, sequence, createdAt }
 *   epochs/<id>/          one evidence data dir per epoch
 *   window/               discovery ledger (outside every epoch)
 *
 * Never rotate while the current epoch records a fail-closed STOP: the STOP
 * must stay attached to the evidence it is about until an operator resumes.
 * A new epoch starts with no cursor; its first segment is an INITIAL lineage,
 * so no continuity is ever claimed across epochs.
 */

const fs = require('fs');
const path = require('path');

const POINTER_VERSION = 1;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function dirBytes(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirBytes(full);
    else if (entry.isFile()) total += fs.statSync(full).size;
  }
  return total;
}

function epochId(sequence, nowMs) {
  const stamp = new Date(nowMs).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `e${String(sequence).padStart(6, '0')}-${stamp}`;
}

function readPointer(rootDir) {
  const file = path.join(rootDir, 'epoch.json');
  if (!fs.existsSync(file)) return null;
  let pointer;
  try {
    pointer = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    fail('EPOCH_POINTER_UNREADABLE');
  }
  if (!pointer || pointer.version !== POINTER_VERSION ||
      typeof pointer.current !== 'string' || !/^e\d{6}-[0-9TZ]+$/.test(pointer.current) ||
      !Number.isSafeInteger(pointer.sequence) || !Number.isSafeInteger(pointer.createdAtMs)) {
    fail('EPOCH_POINTER_INVALID');
  }
  return pointer;
}

function writePointer(rootDir, pointer) {
  fs.mkdirSync(rootDir, { recursive: true });
  const file = path.join(rootDir, 'epoch.json');
  fs.writeFileSync(file + '.tmp', JSON.stringify(pointer, null, 2) + '\n');
  fs.renameSync(file + '.tmp', file);
}

function listEpochs(rootDir) {
  const dir = path.join(rootDir, 'epochs');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^e\d{6}-/.test(entry.name))
    .map(entry => entry.name)
    .sort();
}

/*
 * isStopped(epochDir) -> true when that epoch's state records a non-retryable
 * failure (fail-closed STOP). Supplied by the caller so this module stays free
 * of operational-state policy.
 */
function resolveEpoch({
  rootDir,
  nowMs = Date.now(),
  maxAgeMs,
  maxBytes,
  keepOld = 1,
  isStopped = () => false,
}) {
  if (typeof rootDir !== 'string' || rootDir === '') fail('EPOCH_ROOT_REQUIRED');
  if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs < 1) fail('EPOCH_MAX_AGE_INVALID');
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) fail('EPOCH_MAX_BYTES_INVALID');
  if (!Number.isSafeInteger(keepOld) || keepOld < 0) fail('EPOCH_KEEP_INVALID');

  let pointer = readPointer(rootDir);
  let rotated = false;
  let reason = null;

  if (!pointer) {
    pointer = { version: POINTER_VERSION, sequence: 1, current: epochId(1, nowMs), createdAtMs: nowMs };
    reason = 'FIRST_EPOCH';
  } else {
    const currentDir = path.join(rootDir, 'epochs', pointer.current);
    const ageMs = nowMs - pointer.createdAtMs;
    const bytes = dirBytes(currentDir);
    const due = ageMs >= maxAgeMs ? 'MAX_AGE' : (bytes >= maxBytes ? 'MAX_BYTES' : null);
    if (due) {
      if (isStopped(currentDir)) {
        reason = `ROTATION_HELD_BY_STOP_${due}`;
      } else {
        const sequence = pointer.sequence + 1;
        pointer = { version: POINTER_VERSION, sequence, current: epochId(sequence, nowMs), createdAtMs: nowMs };
        rotated = true;
        reason = due;
      }
    }
  }

  const epochDir = path.join(rootDir, 'epochs', pointer.current);
  fs.mkdirSync(epochDir, { recursive: true });
  writePointer(rootDir, pointer);

  // Delete whole old epochs beyond keepOld (never the current one).
  const removed = [];
  const older = listEpochs(rootDir).filter(name => name < pointer.current);
  const excess = older.length - keepOld;
  for (let i = 0; i < excess; i += 1) {
    fs.rmSync(path.join(rootDir, 'epochs', older[i]), { recursive: true, force: true });
    removed.push(older[i]);
  }

  return {
    epochId: pointer.current,
    epochDir,
    createdAtMs: pointer.createdAtMs,
    rotated,
    reason,
    removed,
    kept: listEpochs(rootDir),
  };
}

module.exports = {
  dirBytes,
  listEpochs,
  readPointer,
  resolveEpoch,
};
