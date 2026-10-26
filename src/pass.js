'use strict';

/*
 * One bounded ingestion pass for schedulers that start a fresh process each
 * time (GitHub Actions cron, Termux cron/termux-job-scheduler, a shell loop).
 *
 * It keeps the runner's fail-closed rule across processes:
 *   - previous pass ended in a NON-retryable failure (BLOCKED / UNKNOWN /
 *     authority, checkpoint, writer-fence, ...): do not touch RPC or data,
 *     print STOP and exit 78. Only an operator (--resume-after-stop, or the
 *     workflow_dispatch input resume_after_stop) runs the next pass; the
 *     authority gate then re-validates everything as usual.
 *   - otherwise run exactly one src/index.js pass (verified processing
 *     context -> authority gate -> cursor advance, unchanged).
 *
 * Exit codes: 0 pass OK; 0 + warning for a retryable provider failure (the
 * cursor did not move; the next scheduled pass retries); 78 fail-closed STOP;
 * 1 anything else.
 */

const fs = require('fs');
const path = require('path');
// Modules that read HAHAWEEK_DATA_DIR at load time (state, database, raw
// store, writer fence, legacy freeze) are required lazily, AFTER window mode
// has pointed HAHAWEEK_DATA_DIR at the current evidence epoch.
const { readOperationalState, isRetryableFailure } = require('./core/operational-state');
const config = require('./core/config');
const { PROFILE, MODE, RPC_URL, RPC_URLS } = config;
const { redactText } = require('./core/redact');
const { resolveEpoch } = require('./core/window-retention');

const EXIT_FAIL_CLOSED = 78;

function loadState() {
  return require('./core/state').loadState();
}

// Per-file overrides would pin evidence files outside the epoch directory.
const EPOCH_PINNING_ENV = [
  'HAHAWEEK_STATE_FILE',
  'HAHAWEEK_DB_FILE',
  'HAHAWEEK_RAW_FILE',
  'HAHAWEEK_WRITER_FENCE_FILE',
  'HAHAWEEK_LEGACY_FREEZE_FILE',
];

const DATA_DIR_MODULES = ['state.js', 'database.js', 'raw-store.js', 'single-writer-fence.js', 'legacy-write-freeze.js']
  .map(name => path.join(__dirname, 'core', name));

function epochStopped(epochDir) {
  const file = path.join(epochDir, 'state.json');
  if (!fs.existsSync(file)) return false;
  try {
    return decidePass(JSON.parse(fs.readFileSync(file, 'utf8'))).run === false;
  } catch {
    // Unreadable state: treat as STOP, never rotate it away.
    return true;
  }
}

/*
 * Window mode: pick (and if due, rotate) the evidence epoch, then point
 * HAHAWEEK_DATA_DIR at it. The discovery ledger stays in <root>/window.
 */
function prepareWindowEpoch({ env = process.env, settings = config, nowMs = Date.now() } = {}) {
  for (const name of EPOCH_PINNING_ENV) {
    if (env[name] !== undefined && String(env[name]).trim() !== '') {
      throw new Error(`INVALID_CONFIG: ${name} cannot be set in window mode (evidence files live in the epoch directory)`);
    }
  }
  const loaded = DATA_DIR_MODULES.filter(file => require.cache[file]);
  if (loaded.length > 0) throw new Error('WINDOW_EPOCH_ENV_TOO_LATE');
  const rootDir = path.resolve(env.HAHAWEEK_WINDOW_ROOT_DIR || env.HAHAWEEK_DATA_DIR || path.join(process.cwd(), 'data'));
  const epoch = resolveEpoch({
    rootDir,
    nowMs,
    maxAgeMs: settings.EPOCH_MAX_AGE_MS,
    maxBytes: settings.EPOCH_MAX_BYTES,
    keepOld: settings.EPOCH_KEEP_OLD,
    isStopped: epochStopped,
  });
  env.HAHAWEEK_WINDOW_ROOT_DIR = rootDir;
  env.HAHAWEEK_DATA_DIR = epoch.epochDir;
  return epoch;
}

/*
 * One window pass at a time per root dir (the discovery ledger and the epoch
 * pointer live outside the evidence writer fence). A lock older than
 * staleMs is taken over (crashed pass).
 */
function acquirePassLock(rootDir, { staleMs, nowMs = Date.now() } = {}) {
  const dir = path.join(rootDir, 'window');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'pass.lock');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(file, 'wx');
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, at: nowMs }) + '\n');
      fs.closeSync(fd);
      return () => { try { fs.unlinkSync(file); } catch { /* already gone */ } };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const age = nowMs - fs.statSync(file).mtimeMs;
      if (age > staleMs) { fs.rmSync(file, { force: true }); continue; }
      return null;
    }
  }
  return null;
}

function decidePass(state, { resumeAfterStop = false } = {}) {
  let operational;
  try {
    operational = readOperationalState(state);
  } catch (error) {
    return { run: false, reason: `OPERATIONAL_STATE_UNREADABLE: ${error.code || error.message}` };
  }
  const failure = operational.failure;
  if (!failure) return { run: true, reason: 'NO_PREVIOUS_FAILURE' };
  if (isRetryableFailure(failure)) return { run: true, reason: `RETRY_AFTER_${failure.failure_class}` };
  if (resumeAfterStop) return { run: true, reason: `OPERATOR_RESUME_AFTER_${failure.failure_class}` };
  return { run: false, reason: `STOPPED_${failure.failure_class}:${failure.failure_code}` };
}

function exitCodeForError(state) {
  try {
    const failure = readOperationalState(state).failure;
    return failure && isRetryableFailure(failure) ? 0 : 1;
  } catch {
    return 1;
  }
}

async function runPass({
  argv = process.argv.slice(2),
  getState = loadState,
  runMain = () => require('./index').main(),
  output = console.log,
  errorOutput = console.error,
  mode = MODE,
  prepareEpoch = prepareWindowEpoch,
  passLock = acquirePassLock,
} = {}) {
  const resumeAfterStop = argv.includes('--resume-after-stop');
  output(`=== HAHAWEEK PASS (profile: ${PROFILE}, mode: ${mode}) ===`);

  let releaseLock = null;
  if (mode === 'window') {
    let epoch;
    try {
      epoch = prepareEpoch();
    } catch (error) {
      errorOutput(`HAHAWEEK PASS: window epoch setup failed: ${error.message}`);
      errorOutput('HAHAWEEK PASS: STOP / FAIL-CLOSED');
      return EXIT_FAIL_CLOSED;
    }
    output(`HAHAWEEK PASS: epoch ${epoch.epochId}${epoch.rotated ? ` (rotated: ${epoch.reason})` : (epoch.reason ? ` (${epoch.reason})` : '')}` +
      `${epoch.removed.length ? `; removed ${epoch.removed.join(', ')}` : ''}`);
    releaseLock = passLock(process.env.HAHAWEEK_WINDOW_ROOT_DIR || path.dirname(path.dirname(epoch.epochDir)), {
      staleMs: 2 * config.MAX_RUNTIME_MS,
    });
    if (releaseLock === null) {
      output('::warning::HAHAWEEK PASS: another window pass holds the lock; skipping this pass');
      return 0;
    }
  }
  try {
    return await runDecidedPass({ argv, getState, runMain, output, errorOutput, resumeAfterStop });
  } finally {
    if (releaseLock) releaseLock();
  }
}

async function runDecidedPass({ getState, runMain, output, errorOutput, resumeAfterStop }) {

  let state;
  try {
    state = getState();
  } catch (error) {
    errorOutput(`HAHAWEEK PASS: state unreadable: ${error.message}`);
    errorOutput('HAHAWEEK PASS: STOP / FAIL-CLOSED');
    return EXIT_FAIL_CLOSED;
  }

  const decision = decidePass(state, { resumeAfterStop });
  output(`HAHAWEEK PASS: ${decision.run ? 'run' : 'skip'} (${decision.reason})`);
  if (!decision.run) {
    errorOutput('HAHAWEEK PASS: previous failure is non-retryable; STOP / FAIL-CLOSED.');
    errorOutput('HAHAWEEK PASS: inspect the logs, then rerun with --resume-after-stop.');
    return EXIT_FAIL_CLOSED;
  }

  try {
    await runMain();
    return 0;
  } catch (error) {
    const message = redactText(error instanceof Error ? error.message : String(error), [RPC_URL, ...RPC_URLS]);
    let after = null;
    try { after = getState(); } catch { /* fall through to exit 1 */ }
    const code = after ? exitCodeForError(after) : 1;
    if (code === 0) {
      // GitHub Actions annotation; harmless elsewhere.
      output(`::warning::HAHAWEEK PASS: retryable provider failure, cursor unchanged: ${message}`);
    } else {
      errorOutput(`HAHAWEEK PASS: FAILED: ${message}`);
    }
    return code;
  }
}

if (require.main === module) {
  runPass().then(code => { process.exitCode = code; });
}

module.exports = {
  EXIT_FAIL_CLOSED,
  acquirePassLock,
  decidePass,
  epochStopped,
  prepareWindowEpoch,
  runPass,
};
