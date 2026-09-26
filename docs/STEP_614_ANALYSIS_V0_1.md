# STEP 614 — Analysis v0.1

## Starting state

Main HEAD inspected before Analysis:

`6199040f7866c73fbcecda18d22081b8fabaa71d`

PROJECT_STATE.md authority:

- Current STEP: 614.
- Current phase: DOCUMENTATION — VERIFIED / RECONCILED / DOCUMENTED.
- Next authorized phase: Analysis for STEP 614.
- Global LIVE-READINESS: NOT READY / BLOCKED.

## Contract under analysis

`docs/CONTRACT_LIVE_READINESS_ACTUAL_OPERATOR_RUNTIME_V0_1.md`

The Contract requires actual operator evidence for:

SETUP → START → STATUS → HEALTH → UNDERSTAND OUTPUT → IDENTIFY FAILURE → RECOVER → VERIFY RECOVERY → KNOW WHEN TO STOP.

It forbids invented runtime evidence and requires fail-closed behavior.

## Repository inspection

Inspected:

- `bin/hahaweek`
- `src/status.js`
- `src/health.js`
- `src/runner.js`
- `src/index.js`
- `src/core/state.js`
- `src/core/block-cursor.js`
- `src/core/ingestion.js`
- `src/core/operational-state.js`
- `src/core/operational-failure-persistence.js`
- `src/core/config.js`
- `package.json`
- lifecycle-state tests and CI evidence.

## Existing operator surface

Repository-defined commands are:

- `./bin/hahaweek status`
- `./bin/hahaweek test`
- `./bin/hahaweek health`
- `./bin/hahaweek scan`
- `./bin/hahaweek start`
- `./bin/hahaweek repair`

No new command is required by this Analysis.

## Positive findings

### Status

`src/status.js` exposes:

- operational state;
- cursor;
- last verified cursor;
- failure class/code/boundary;
- recoverability;
- evidence impact;
- authority impact;
- recovery requirement;
- recovery state;
- explicit STOP / FAIL-CLOSED for BLOCKED, FAILED, and UNKNOWN.

### Health

`src/health.js` exposes:

- RPC URL;
- expected chain ID;
- actual chain ID;
- current block;
- operational state;
- HEALTH OK versus HEALTH NOT READY.

RPC failure persists operational failure and exits non-zero.

### Failure model

`src/core/operational-state.js` distinguishes provider/evidence/authority/checkpoint/cursor/writer-fence/recovery/state-corruption failures.

Retryable classes are explicitly limited to:

- PROVIDER_UNAVAILABLE
- EVIDENCE_UNAVAILABLE

Unknown/corrupt/authority/integrity failures become non-retryable STOP conditions.

### Recovery / persistence

`src/core/operational-failure-persistence.js` uses a writer fence and preserves prior cursor state while persisting failure classification.

`src/core/ingestion.js` advances the cursor only after successful processing and authority acceptance.

`src/core/block-cursor.js` rejects cursor regression.

### Runner

`src/runner.js` runs health before scan, retries only retryable operational failures, uses bounded exponential backoff, and stops fail-closed when operational state is unreadable or non-retryable.

## Finding F-614-01 — Status wrapper masks failure

`bin/hahaweek` currently invokes:

`node "$ROOT/src/status.js" || true`

This means an execution failure in `src/status.js` is converted by the wrapper into a successful shell command.

This conflicts with the Contract requirement that failure be visible, diagnosable, and fail-closed. It also weakens operator acceptance because a malformed/corrupt operational state can produce a failed status implementation while the outer command returns success.

### Classification

- Boundary: OPERATOR
- Type: FAIL-CLOSED / ERROR-PROPAGATION
- Severity: Contract-relevant
- Production data semantics: unaffected
- Evidence authority: unaffected
- Cursor authority: unaffected

### Required treatment

Fix within the Contract by removing the unconditional success masking while preserving the existing status output and STOP semantics.

No architecture redesign is required.

## Finding F-614-02 — Actual operator environment remains externally unverified

Repository inspection confirms the command surface and failure semantics, but does not prove execution on the user's actual operator environment.

Repository CI is not equivalent to interactive Termux execution.

Required evidence remains:

SETUP → START → STATUS → HEALTH → failure diagnosis → supported recovery → recovery verification → STOP.

### Classification

- Boundary: EXTERNAL OPERATOR ENVIRONMENT
- Type: EVIDENCE GAP
- Status: UNKNOWN / UNVERIFIED
- Resolution: actual operator execution evidence; do not simulate.

## Finding F-614-03 — Health-before-state usability boundary

`health.js` requires a readable operational state and reports HEALTH NOT READY when the operational state is not HEALTHY. This is consistent with fail-closed semantics but means a freshly initialized environment can legitimately report NOT READY until runtime establishes a healthy operational state.

This is not treated as a defect without runtime evidence.

## Finding F-614-04 — Repository-hosted CI is not LIVE evidence

All relevant repository checks are green for the current documented lifecycle, but they validate repository artifacts, not actual operator interaction.

No LIVE claim is permitted from these checks.

## Impact analysis

The only in-contract implementation defect identified is F-614-01.

Fixing F-614-01 does not require a Contract Amendment because it restores the Contract's explicit failure-propagation requirement and does not change authority, evidence, cursor, recovery, or production semantics.

F-614-02 cannot be solved by inventing repository evidence. It requires actual operator execution.

## Analysis conclusion

The minimum implementation path is:

1. Design the status-command error propagation fix and operator verification procedure.
2. Implement the status wrapper fix only.
3. Test normal status and status failure propagation.
4. Run Security/Regression and CI.
5. Verify merge and reconcile.
6. Execute the actual operator evidence path when an actual operator environment is available.

Global LIVE-READINESS remains NOT READY / BLOCKED until the external operator evidence exists.
