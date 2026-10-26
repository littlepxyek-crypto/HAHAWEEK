'use strict';

const { spawn } = require('node:child_process');
const { loadState } = require('./core/state');
const { readOperationalState, isRetryableFailure } = require('./core/operational-state');

const {
  CHUNK_SIZE,
  MAX_BATCHES_PER_RUN,
  RPC_URL,
  RPC_URLS,
  LOOP_SLEEP_MS,
  CATCHUP_SLEEP_MS,
  PROFILE,
} = require('./core/config');
const { redactText } = require('./core/redact');

function envInteger(names, fallback) {
  for (const name of names) {
    const raw = process.env[name];
    if (raw === undefined || String(raw).trim() === '') continue;
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`INVALID_CONFIG: ${name} must be an integer >= 0`);
    }
    return value;
  }
  return fallback;
}

// Sleep between ingestion passes when caught up with the chain.
// Profile default: free 60000, fast 5000 (src/core/config.js).
const POLL_INTERVAL_MS = LOOP_SLEEP_MS;

// Sleep between passes while still behind (the previous pass hit its batch cap).
// Profile default: free 15000, fast 250.
const CATCH_UP_SLEEP_MS = CATCHUP_SLEEP_MS;

const MAX_BACKOFF_MS =
  envInteger(['RUNNER_MAX_BACKOFF_MS'], 60000);

/*
 * What to do after a fail-closed STOP:
 *   exit (default): exit with EXIT_FAIL_CLOSED so systemd can be told not to
 *                   restart (RestartPreventExitStatus=78).
 *   hold:           stay alive without running cycles until SIGTERM/SIGINT,
 *                   so a Docker restart policy cannot restart-loop a
 *                   BLOCKED authority state.
 */
const ON_STOP = process.env.HAHAWEEK_RUNNER_ON_STOP === 'hold' ? 'hold' : 'exit';

// EX_CONFIG from sysexits.h: operator intervention required.
const EXIT_FAIL_CLOSED = 78;

let stopping = false;
let child = null;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    if (stopping) {
      resolve();
      return;
    }

    child = spawn(
      process.execPath,
      [command, ...args],
      {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: process.env,
      }
    );

    child.once('error', error => {
      child = null;
      reject(error);
    });

    child.once('exit', (code, signal) => {
      child = null;

      if (stopping) {
        resolve();
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `COMMAND_FAILED: ${command} exit=${code} signal=${signal || 'none'}`
        )
      );
    });
  });
}

async function cycle() {
  await runCommand('src/health.js');
  await runCommand('src/index.js', ['--once']);
}

function readCursor(getState) {
  try {
    const state = getState();
    return Number.isInteger(state && state.lastProcessedBlock)
      ? state.lastProcessedBlock
      : null;
  } catch {
    return null;
  }
}

/*
 * A pass that advanced the cursor by its full batch budget is presumed to
 * still be behind the safe head, so the next pass starts after a short
 * catch-up sleep instead of the normal poll interval.
 */
function nextSleepMs({ before, after, passBlocks, intervalMs, catchUpSleepMs }) {
  if (
    Number.isInteger(after) &&
    Number.isInteger(passBlocks) &&
    passBlocks > 0 &&
    after - (Number.isInteger(before) ? before : after - passBlocks) >= passBlocks
  ) {
    return Math.min(catchUpSleepMs, intervalMs);
  }
  return intervalMs;
}

async function runRunner({
  intervalMs = POLL_INTERVAL_MS,
  catchUpSleepMs = CATCH_UP_SLEEP_MS,
  maxBackoffMs = MAX_BACKOFF_MS,
  passBlocks = CHUNK_SIZE * MAX_BATCHES_PER_RUN,
  onStop = ON_STOP,
  output = console.log,
  runCycle = cycle,
  getState = loadState,
  sleepFn = sleep,
  maxCycles = Infinity,
} = {}) {
  let backoff = intervalMs;
  let cycles = 0;
  let outcome = 'SIGNAL';

  output('=== HAHAWEEK RUNNER ===');
  output(`Profile: ${PROFILE}`);
  output(`Interval: ${intervalMs}ms`);
  output(`Catch-up interval: ${catchUpSleepMs}ms`);
  output(`Max backoff: ${maxBackoffMs}ms`);

  while (!stopping) {
    if (cycles >= maxCycles) {
      outcome = 'MAX_CYCLES';
      break;
    }
    cycles += 1;
    try {
      output('RUNNER: cycle start');

      const before = readCursor(getState);
      await runCycle();

      if (stopping) {
        break;
      }

      backoff = intervalMs;

      const after = readCursor(getState);
      const wait = nextSleepMs({ before, after, passBlocks, intervalMs, catchUpSleepMs });
      output(`RUNNER: cycle OK cursor=${after === null ? 'UNKNOWN' : after}`);
      if (wait < intervalMs) output('RUNNER: behind safe head; catching up');

      await sleepFn(wait);
    } catch (error) {
      output(`RUNNER: cycle failed: ${redactText(error.message, [RPC_URL, ...RPC_URLS])}`);

      if (stopping) {
        break;
      }

      let state;
      try {
        state = readOperationalState(getState());
      } catch (stateError) {
        output(`RUNNER: operational state unreadable: ${stateError.message}`);
        output('RUNNER: STOP / FAIL-CLOSED');
        outcome = 'FAIL_CLOSED';
        break;
      }

      const failure = state.failure;
      if (!shouldRetryOperationalState(state)) {
        output(`RUNNER: state=${state.operationalState || 'UNKNOWN'}`);
        output('RUNNER: failure is non-retryable; STOP / FAIL-CLOSED');
        outcome = 'FAIL_CLOSED';
        break;
      }

      output(`RUNNER: retryable failure=${failure.failure_class}`);
      output(`RUNNER: retry in ${backoff}ms`);

      await sleepFn(backoff);

      backoff = Math.min(
        backoff * 2,
        maxBackoffMs
      );
    }
  }

  if (outcome === 'FAIL_CLOSED' && onStop === 'hold') {
    output('RUNNER: holding in STOPPED state; no further cycles until restart by an operator');
    while (!stopping) {
      await sleepFn(intervalMs);
    }
  }

  output('RUNNER: stopped');
  return { outcome, cycles };
}

function shouldRetryOperationalState(state) {
  try {
    const operational = readOperationalState(state);
    return isRetryableFailure(operational.failure);
  } catch {
    return false;
  }
}

function shutdown(signal) {
  if (stopping) {
    return;
  }

  stopping = true;

  console.log(`RUNNER: received ${signal}`);

  if (child) {
    child.kill('SIGTERM');
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

if (require.main === module && require('./core/config').MODE === 'window') {
  // Window mode needs a fresh process per pass (epoch rotation, ledger lock).
  const watch = require('./watch');
  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGTERM');
  process.on('SIGINT', () => watch.shutdown('SIGINT'));
  process.on('SIGTERM', () => watch.shutdown('SIGTERM'));
  watch.runWatch().then(({ outcome }) => {
    if (outcome === 'FAIL_CLOSED') process.exitCode = EXIT_FAIL_CLOSED;
  });
} else if (require.main === module) {
  runRunner()
    .then(({ outcome }) => {
      if (outcome === 'FAIL_CLOSED') process.exitCode = EXIT_FAIL_CLOSED;
    })
    .catch(error => {
      console.error('RUNNER: FAILED');
      console.error(redactText(error.message, [RPC_URL, ...RPC_URLS]));
      process.exitCode = 1;
    });
}

module.exports = {
  EXIT_FAIL_CLOSED,
  nextSleepMs,
  runRunner,
  runCommand,
  shouldRetryOperationalState,
};
