# STEP 614 — Writer-Fence Watchdog Liveness & Failure-State Recovery Analysis v0.1

## Trigger

Fresh actual operator runtime on main `af4f63753a29fa554ba970d142bc2aa81e39a507` processed range `64988887-64988896` with `Processing context: VERIFIED` and `Authority: AUTHORIZED`, then the next runner cycle failed with:

`Writer-fence watchdog renewal failed: WRITER_FENCE_EXPIRED`.

Read-only operator evidence afterward showed:

- no HAHAWEEK/Node process;
- no writer-fence lock file;
- writer-fence state remained durable;
- operational state remained `RUNNING / INITIALIZING` with no failure because the failure-state write itself is guarded by the expired writer fence.

## Root Cause Boundary

Two bounded defects are present in the existing STEP 614 writer-fence/operational-state mechanism:

1. The watchdog worker waits for its first periodic interval before renewing. A lease acquired immediately before worker startup therefore has no immediate watchdog refresh.
2. The watchdog default interval is lease/3. Node.js documents that timer callbacks are not guaranteed to fire at an exact requested time; worker threads have independent event loops but still use scheduled timers. The existing 30s lease therefore has avoidable scheduling margin.
3. When the writer fence has already expired, the normal state persistence path cannot persist the terminal operational failure because it correctly refuses writes without ownership.
4. The repository already contains `persistOperationalFailure()`, which acquires a fresh writer fence specifically for operational failure persistence, but `src/index.js` does not use it as a fallback when its active fence can no longer write.

These are implementation/liveness/observability defects inside the existing Contract. They do not change evidence, authority, cursor, checkpoint, CBDR, V4, Surveillance, or execution semantics.

## Contract Check

The existing STEP 614 Contract requires:

- visible and diagnosable failures;
- durable failure/recovery state;
- fail-closed behavior when writer authority is uncertain;
- recovery from the last verified state;
- no historical mutation or cursor reset.

The proposed remediation remains inside that scope.

No Contract Amendment is required.

## Required Invariants

1. Writer ownership and fence identity remain unchanged.
2. Expired fences cannot be resurrected.
3. The watchdog remains the sole periodic renewal path while active.
4. The watchdog performs an immediate renewal before reporting readiness.
5. The watchdog renews with additional scheduling margin without changing lease duration or expiry semantics.
6. A renewal failure remains sticky and fail-closed.
7. Operational failure persistence may acquire a new writer fence only after the failing writer can no longer persist its own derived operational state; it must never advance processing authority or cursor.
8. Cursor advancement remains after verified processing and authority only.
9. Evidence remains preserved.
10. No fallback authority or evidence reinterpretation is introduced.

## Evidence

Node.js documentation confirms timer callbacks are not guaranteed to execute at precisely their requested delay, while worker threads execute JavaScript in independent threads/event loops. These facts justify reducing avoidable scheduling slack and renewing immediately, but do not prove an Android-specific scheduling cause.

## Non-Goals

- No lease-duration change.
- No expiry-rule change.
- No cursor reset.
- No authority expansion.
- No evidence rewrite/deletion.
- No V4 activation.
- No Surveillance authority.
- No trading/signing/execution.
