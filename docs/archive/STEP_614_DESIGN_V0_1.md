# STEP 614 — Design v0.1

## Design objective

Close F-614-01 with the smallest possible change that restores fail-closed operator behavior.

## Frozen boundary

No change to:

- raw/canonical evidence;
- deterministic identity;
- integrity;
- manifest/checkpoint/cursor;
- recovery semantics;
- Surveillance authority;
- V4 authority;
- trading/signing/execution;
- actor inference;
- supported command names.

## Change D-614-01

In `bin/hahaweek`:

Current behavior:

`node "$ROOT/src/status.js" || true`

Designed behavior:

`node "$ROOT/src/status.js"`

The wrapper must propagate the status implementation's non-zero exit code.

No output semantics are changed.

## Regression coverage D-614-02

Add operator-wrapper tests that execute the repository-supported status command through the shell interpreter and verify:

1. Healthy/valid status path returns zero.
2. Malformed operational state causes status to return non-zero.
3. Failure output remains visible.
4. STOP / FAIL-CLOSED output remains present for blocking operational states.
5. No cursor/state reset occurs as part of status.
6. Existing lifecycle-state authority tests remain aligned with current PROJECT_STATE.

The tests use isolated temporary state through existing `HAHAWEEK_DATA_DIR` support and do not mutate repository data.

## Operator verification design

After implementation, the actual operator path remains the repository-supported commands:

- `./bin/hahaweek status`
- `./bin/hahaweek health`
- `./bin/hahaweek test`
- `./bin/hahaweek scan`
- `./bin/hahaweek start`
- `./bin/hahaweek repair`

No new command is introduced.

## Failure behavior

If `src/status.js` fails, `bin/hahaweek status` must fail.

If operational state is BLOCKED, FAILED, or UNKNOWN, status output must retain explicit STOP / FAIL-CLOSED.

No failure may be converted into healthy success by the wrapper.

## Security / regression considerations

The change is constrained to process exit propagation.

It cannot:

- advance cursor;
- mutate evidence;
- change authority;
- delete history;
- change RPC behavior;
- change retry policy;
- introduce trading/signing/execution.

## Acceptance criteria

- Status implementation failure produces non-zero wrapper exit.
- Valid status continues to work.
- Existing tests remain green.
- Security/Regression remains green.
- CI/CodeQL remain green.
- No frozen semantic boundary changes.
- Actual operator runtime remains a separate evidence gate and is not claimed by this Design.
