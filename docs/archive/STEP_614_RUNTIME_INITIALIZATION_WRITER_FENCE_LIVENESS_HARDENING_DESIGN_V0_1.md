# STEP 614 — Runtime Initialization Writer-Fence Liveness Hardening Design v0.1

## Objective

Close the bounded liveness gap in which an acquired writer fence is held during engine initialization/reconciliation before the existing watchdog starts.

## Design

1. `createEngine()` acquires the writer fence.
2. Immediately after successful acquisition, it starts the existing writer-fence watchdog.
3. The watchdog remains active across database creation, raw-store setup, authority reconciliation, and other asynchronous engine initialization.
4. `IngestionEngine.runOnce()` continues to call `startWatchdog()`; because the fence already owns an active watchdog, the existing idempotent behavior returns the existing readiness promise rather than creating a second watchdog.
5. If engine initialization fails after the watchdog has started, initialization cleanup stops the watchdog and releases the fence before propagating the failure.
6. Normal scan completion continues to stop the watchdog in the existing ingestion `finally` path and releases the fence in the existing index `finally` path.

## Failure behavior

- Watchdog renewal failure remains fail-closed through the existing `WRITER_FENCE_WATCHDOG_RENEWAL_FAILED` path.
- Fence ownership and expiry rules remain unchanged.
- A stale/expired fence remains a hard failure.
- Provider timeout remains `PROVIDER_UNAVAILABLE`, retryable under the existing runner policy.
- No cursor/evidence/checkpoint/authority write is made valid by the watchdog itself.

## Concurrency

The existing watchdog is the sole renewal mechanism during `runOnce()` when active. This design extends that same already-authorized watchdog protection backward to the engine initialization boundary; it does not introduce a second renewal authority.

## Recovery

After a failed run, the next operator start must reacquire a higher fence from the durable state and reconstruct authority only through the existing reconciliation/authority path. No cursor reset or evidence deletion is permitted.

## Test strategy

Add deterministic integration coverage around engine initialization by injecting a controlled initialization delay longer than the lease and verifying the acquired writer fence remains owned while the watchdog is active. Preserve the existing writer-fence blocked-main-thread test as the lower-level liveness regression.

Where direct engine dependency injection is not practical, use the writer-fence lifecycle primitive with an initialization-equivalent asynchronous delay and explicit cleanup to prove the contract boundary.

## Non-goals

- no lease-duration change;
- no expiry-rule change;
- no writer ownership model change;
- no retry-policy change;
- no cursor/evidence/checkpoint authority change;
- no V4/Surveillance/trading/signing/execution change.

## Acceptance criteria

- The watchdog is active before long engine initialization begins.
- Initialization failure cannot leave a live watchdog or writer lease behind.
- Existing scan watchdog behavior remains idempotent.
- Existing writer-fence and security/regression tests remain green.
- Current-main operator evidence after merge demonstrates recovery and sustained liveness.

## Status

DESIGN — READY FOR CODE under the existing STEP 614 Contract.
