'use strict';

/*
 * Window-watch loop for a long-running host (Termux, a small VPS).
 *
 * Starts `node src/pass.js` again and again in a fresh process (so every pass
 * re-reads the epoch, may rotate it, and keeps the fail-closed rule):
 *   exit 0   sleep HAHAWEEK_LOOP_SLEEP_MS, run the next pass;
 *   exit 78  fail-closed STOP: stop the loop (or hold with
 *            HAHAWEEK_RUNNER_ON_STOP=hold) and exit 78; an operator resumes
 *            with `node src/pass.js --resume-after-stop`;
 *   other    exponential backoff (up to RUNNER_MAX_BACKOFF_MS), then retry.
 */

const { spawn } = require('node:child_process');
const path = require('path');
const { LOOP_SLEEP_MS } = require('./core/config');

const EXIT_FAIL_CLOSED = 78;
let stopping = false;
let child = null;

function sleep(ms) {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, ms);
    if (stopping) { clearTimeout(timer); resolve(); }
  });
}

function runPassProcess(args = []) {
  return new Promise((resolve, reject) => {
    child = spawn(process.execPath, [path.join(__dirname, 'pass.js'), ...args], {
      stdio: 'inherit',
      env: process.env,
    });
    child.once('error', error => { child = null; reject(error); });
    child.once('exit', code => { child = null; resolve(code === null ? 1 : code); });
  });
}

async function runWatch({
  sleepMs = LOOP_SLEEP_MS,
  maxBackoffMs = Number(process.env.RUNNER_MAX_BACKOFF_MS || 600000),
  onStop = process.env.HAHAWEEK_RUNNER_ON_STOP === 'hold' ? 'hold' : 'exit',
  runOnePass = runPassProcess,
  sleepFn = sleep,
  output = console.log,
  maxPasses = Infinity,
} = {}) {
  let backoff = sleepMs;
  let passes = 0;
  output(`=== HAHAWEEK WATCH (window mode) sleep=${sleepMs}ms ===`);
  while (!stopping && passes < maxPasses) {
    passes += 1;
    const started = Date.now();
    const code = await runOnePass();
    output(`WATCH: pass ${passes} exit=${code} in ${Date.now() - started}ms`);
    if (code === EXIT_FAIL_CLOSED) {
      output('WATCH: fail-closed STOP; run `node src/pass.js --resume-after-stop` after inspecting the logs');
      if (onStop === 'hold') {
        while (!stopping) await sleepFn(sleepMs);
      }
      return { outcome: 'FAIL_CLOSED', passes };
    }
    if (code === 0) {
      backoff = sleepMs;
      await sleepFn(sleepMs);
    } else {
      output(`WATCH: pass failed; retry in ${backoff}ms`);
      await sleepFn(backoff);
      backoff = Math.min(Math.max(1, backoff) * 2, maxBackoffMs);
    }
  }
  return { outcome: stopping ? 'SIGNAL' : 'MAX_PASSES', passes };
}

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`WATCH: received ${signal}`);
  if (child) child.kill('SIGTERM');
}

if (require.main === module) {
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  runWatch().then(({ outcome }) => {
    if (outcome === 'FAIL_CLOSED') process.exitCode = EXIT_FAIL_CLOSED;
  });
}

module.exports = { EXIT_FAIL_CLOSED, runWatch, shutdown };
