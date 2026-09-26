'use strict';

const { spawn } = require('node:child_process');
const { loadState } = require('./core/state');
const { readOperationalState, isRetryableFailure } = require('./core/operational-state');

const POLL_INTERVAL_MS =
  Number(process.env.RUNNER_INTERVAL_MS || 5000);

const MAX_BACKOFF_MS =
  Number(process.env.RUNNER_MAX_BACKOFF_MS || 60000);

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

async function runRunner({
  intervalMs = POLL_INTERVAL_MS,
  maxBackoffMs = MAX_BACKOFF_MS,
  output = console.log,
} = {}) {
  let backoff = intervalMs;

  output('=== HAHAWEEK RUNNER ===');
  output(`Interval: ${intervalMs}ms`);
  output(`Max backoff: ${maxBackoffMs}ms`);

  while (!stopping) {
    try {
      output('RUNNER: cycle start');

      await cycle();

      if (stopping) {
        break;
      }

      backoff = intervalMs;

      output('RUNNER: cycle OK');

      await sleep(intervalMs);
    } catch (error) {
      output(`RUNNER: cycle failed: ${error.message}`);

      if (stopping) {
        break;
      }

      let state;
      try {
        state = readOperationalState(loadState());
      } catch (stateError) {
        output(`RUNNER: operational state unreadable: ${stateError.message}`);
        output('RUNNER: STOP / FAIL-CLOSED');
        break;
      }

      const failure = state.failure;
      if (!shouldRetryOperationalState(state)) {
        output(`RUNNER: state=${state.operationalState || 'UNKNOWN'}`);
        output('RUNNER: failure is non-retryable; STOP / FAIL-CLOSED');
        break;
      }

      output(`RUNNER: retryable failure=${failure.failure_class}`);
      output(`RUNNER: retry in ${backoff}ms`);

      await sleep(backoff);

      backoff = Math.min(
        backoff * 2,
        maxBackoffMs
      );
    }
  }

  output('RUNNER: stopped');
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

if (require.main === module) {
  runRunner().catch(error => {
    console.error('RUNNER: FAILED');
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  runRunner,
  runCommand,
  shouldRetryOperationalState,
};
