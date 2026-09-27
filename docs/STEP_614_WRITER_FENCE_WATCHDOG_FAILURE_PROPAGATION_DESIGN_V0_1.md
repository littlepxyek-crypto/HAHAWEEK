# STEP 614 — Writer-Fence Watchdog Failure Propagation Design v0.1

## Objective

Make worker-thread watchdog renewal failures observable to the owning ingestion path and fail closed before any subsequent authority/cursor advancement, without changing writer-fence ownership or expiry semantics.

## Design

### 1. Worker signal

The watchdog worker continues to renew the exact acquired `filename`, `ownerId`, `fence`, and `leaseMs`.

On renewal failure it sends a structured parent message containing:

- `type: "error"`;
- the concrete writer-fence error code.

The worker does not manufacture ownership or extend an expired fence.

### 2. Parent propagation

The parent-side watchdog state records the first renewal failure as a sticky failure for the lifetime of that watchdog.

The parent converts the worker error into a `WriterFenceError` with a dedicated code:

`WRITER_FENCE_WATCHDOG_RENEWAL_FAILED`

and preserves the underlying concrete code for diagnosis.

A later successful renewal does not clear the recorded failure. This is fail-closed: once the watchdog has reported that it could not maintain its renewal obligation, the current run must not silently continue as though the event never occurred.

### 3. Safety boundary

`assertOwned()` checks the watchdog failure before accepting ownership.

Therefore the next ingestion safety boundary fails closed with the dedicated watchdog failure even if the lease has not yet expired.

The existing lease ownership checks remain unchanged and still reject missing, stale, or expired state.

### 4. Watchdog lifecycle

The watchdog remains the sole periodic renewal mechanism while active.

The main thread does not resume its legacy renewal timer or batch-boundary renewals merely because a watchdog error was observed.

Normal shutdown still waits for worker exit before release.

### 5. Failure classification

`WRITER_FENCE_WATCHDOG_RENEWAL_FAILED` maps to the existing `WRITER_FENCE_FAILURE` class with STOP / BLOCKED / NO_ADVANCE semantics.

No new authority state is introduced.

### 6. Tests

Add regression coverage for:

1. watchdog renews successfully while the main event loop is blocked;
2. a forced watchdog renewal lock failure is propagated to the parent;
3. the propagated watchdog failure causes `assertOwned()` to fail closed;
4. the concrete underlying error code remains available;
5. cursor/authority cannot advance after the propagated failure;
6. existing contention and synchronized shutdown tests remain green.

The failure test will deliberately occupy the fence lock only in the test fixture. It will not alter production expiry semantics.

## Non-Goals

- no lease-duration change;
- no retry/backoff policy change;
- no cursor change;
- no evidence mutation;
- no authority expansion;
- no new operator command;
- no change to Surveillance or execution boundaries;
- no conversion of transient failure into success;
- no historical rewrite.

## Contract Check

This design stays inside the authorized STEP 614 contract because it only strengthens failure visibility and fail-closed liveness of the existing writer-fence mechanism.

Node worker-thread parent/child message delivery is an existing platform mechanism; the worker emits messages through `parentPort.postMessage()` and the parent observes them through the worker message event.
