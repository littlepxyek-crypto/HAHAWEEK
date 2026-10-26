# STEP 614 — Writer-Fence Watchdog Contention Design v0.1

## Scope

Remove self-contention between the event-loop-independent writer-fence watchdog and the legacy main-thread renewal mechanisms.

## Design

1. Attempt to start the watchdog after the initial ownership assertion.
2. If watchdog startup succeeds, mark the watchdog as active.
3. Do not start the main-thread heartbeat while the watchdog is active.
4. Do not perform main-thread batch-boundary `renew()` calls while the watchdog is active.
5. Continue all existing `assertOwned()` checks.
6. Preserve the existing main-thread heartbeat and explicit renewals as a fallback when a writer-fence implementation does not expose a watchdog.
7. Stop the watchdog before releasing the writer fence in the existing `finally` path.

## Safety properties

- No cursor advance occurs because of this change.
- No evidence is deleted or rewritten.
- A failed watchdog startup remains fail-closed.
- A stale or expired fence remains rejected by `assertOwned()`.
- A second process still cannot acquire an active fence.
- Existing non-watchdog writer-fence behavior remains covered by the prior heartbeat/boundary tests.

## Regression

Add an ingestion test with a watchdog-capable fence whose main-thread `renew()` throws if called. A successful batch must complete with zero main-thread renewals, one watchdog start, and one watchdog stop.

This directly guards against reintroducing watchdog/main-thread lock contention.
