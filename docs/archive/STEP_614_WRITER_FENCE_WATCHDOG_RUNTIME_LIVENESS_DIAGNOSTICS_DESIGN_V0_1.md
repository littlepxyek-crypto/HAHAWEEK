# STEP 614 — Writer-Fence Watchdog Runtime Liveness Diagnostics Design v0.1

## Objective

Add bounded runtime observability to the existing writer-fence watchdog so an actual operator failure can be classified from evidence rather than inferred.

## Design

### A. Worker-side timing capture

The watchdog worker records:

- `leaseMs`;
- `intervalMs`;
- watchdog `startedAt`;
- `renewalCount`;
- expected `scheduledAt` for each periodic renewal;
- actual `startedAt` for the renewal attempt;
- actual completion time;
- renewal duration;
- last successful renewal time;
- failure time and cause;
- delay from scheduled renewal to actual renewal start.

The immediate startup renewal has no periodic schedule delay and is still counted as a successful renewal.

### B. Parent-side diagnostic state

The parent writer-fence instance stores the latest worker diagnostic snapshot in memory and exposes it through:

`getWatchdogDiagnostics()`

The existing sticky `watchdogFailure` remains authoritative for fail-closed behavior.

### C. Failure propagation

When a worker renewal fails, the worker sends the diagnostic snapshot together with the concrete error code.

The parent creates the existing `WRITER_FENCE_WATCHDOG_RENEWAL_FAILED` error, preserves `causeCode`, and attaches the diagnostic snapshot as derived diagnostic metadata.

No failure classification or authority semantics change.

### D. Operator visibility

When the runtime catches a failure, `src/index.js` prints the current writer-fence watchdog diagnostic snapshot if available.

This output is observational only. It does not persist into cursor/evidence/authority records and cannot authorize processing.

### E. Test coverage

Add deterministic tests for:

1. immediate renewal produces a diagnostic snapshot;
2. periodic renewal increments the successful renewal count;
3. a forced renewal failure captures cause and schedule delay;
4. existing sticky fail-closed assertion remains unchanged;
5. existing blocked-main-event-loop watchdog test remains valid.

Tests must avoid relying on exact wall-clock values; use relational assertions such as non-negative durations and count monotonicity.

## Boundary / Security

- No lease-duration change.
- No expiry-rule change.
- No retry-policy change.
- No writer-fence ownership change.
- No cursor or checkpoint behavior change.
- No evidence or authority persistence.
- No Surveillance authority.
- No signing/trading/execution.
- Diagnostic data is untrusted operational telemetry and cannot be used as authority.

## Acceptance

The diagnostic implementation is accepted only when repository tests and security/regression checks pass, and a current-main operator run provides sufficient timing/cause evidence to classify the runtime liveness failure or explicitly retain it as UNKNOWN.
