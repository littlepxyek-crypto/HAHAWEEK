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

const { loadState } = require('./core/state');
const { readOperationalState, isRetryableFailure } = require('./core/operational-state');
const { PROFILE, RPC_URL, RPC_URLS } = require('./core/config');
const { redactText } = require('./core/redact');

const EXIT_FAIL_CLOSED = 78;

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
} = {}) {
  const resumeAfterStop = argv.includes('--resume-after-stop');
  output(`=== HAHAWEEK PASS (profile: ${PROFILE}) ===`);

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
  decidePass,
  runPass,
};
