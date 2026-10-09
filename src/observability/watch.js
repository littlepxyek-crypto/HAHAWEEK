'use strict';

const { readStateSnapshot } = require('./read-model');
const { renderSnapshot } = require('./console');

const DEFAULT_INTERVAL_MS = 2000;
const MIN_INTERVAL_MS = 1000;
const MAX_INTERVAL_MS = 60000;

function resolveInterval(value = process.env.HAHAWEEK_OBSERVE_INTERVAL_MS) {
  const parsed = Number(value || DEFAULT_INTERVAL_MS);
  if (!Number.isSafeInteger(parsed) || parsed < MIN_INTERVAL_MS || parsed > MAX_INTERVAL_MS) {
    throw new Error('OBSERVE_INTERVAL_OUT_OF_RANGE');
  }
  return parsed;
}

function startWatch(options = {}) {
  const intervalMs = resolveInterval(options.intervalMs);
  const readSnapshot = options.readSnapshot || readStateSnapshot;
  const output = options.output || console.log;
  const clear = options.clear !== false;
  let stopped = false;
  let timer = null;

  function tick() {
    if (stopped) return;
    try {
      const snapshot = readSnapshot();
      if (clear) output('\u001b[2J\u001b[H');
      output('Refresh interval: ' + intervalMs + 'ms · Press Ctrl+C to exit');
      renderSnapshot(snapshot, output);
    } catch (error) {
      output('OBSERVABILITY: UNAVAILABLE');
      output(error && typeof error.message === 'string' ? error.message : 'UNKNOWN_ERROR');
    }
  }

  tick();
  timer = setInterval(tick, intervalMs);

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      if (timer) clearInterval(timer);
    },
  };
}

if (require.main === module) {
  let watcher;
  try {
    watcher = startWatch();
  } catch (error) {
    console.error('OBSERVABILITY: FAILED');
    console.error(error.message);
    process.exitCode = 2;
  }

  const stop = () => {
    if (watcher) watcher.stop();
    process.exitCode = 0;
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

module.exports = {
  resolveInterval,
  startWatch,
};
