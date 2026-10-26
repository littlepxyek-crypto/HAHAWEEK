# STEP 614 — Writer-Fence Runtime Liveness Hardening Analysis v0.1

## Current runtime finding

Fresh operator evidence on 2026-09-28 shows the existing watchdog can perform successful renewals and then the runtime can still reach:

- `WRITER_FENCE_FAILURE`
- `WRITER_FENCE_EXPIRED`
- failure boundary `RUNTIME`
- recoverability `STOP`
- evidence impact `PRESERVE`
- authority impact `NO_ADVANCE`
- recovery required `true`
- `STOP: FAIL-CLOSED`

The same runtime capture previously showed watchdog diagnostics with `renewalCount=15` and null renewal-failure fields before the terminal expiry. Therefore the captured evidence does not establish a worker-side renewal exception as the immediate cause.

## Root-cause boundary

The root cause remains **UNKNOWN / UNPROVEN**.

The implementation currently uses a worker-thread `setInterval` with a default renewal interval of lease/4 (7.5 seconds for the 30-second lease). Node.js documents that timer callbacks are not guaranteed to execute at an exact requested time. Worker threads have an independent event loop, but this does not establish immunity from host scheduling, suspension, or storage latency.

The evidence therefore supports only these bounded domains:

1. worker scheduling/timer delay;
2. host/runtime suspension or throttling;
3. filesystem lock/write latency;
4. wall-clock behavior;
5. worker lifecycle interruption.

No domain is promoted to root cause.

## Contract check

The existing STEP 614 Contract authorizes bounded reliability remediation for operator usability and failure diagnosis while forbidding changes to lease duration, expiry rules, evidence, cursor, checkpoint, authority, V4, Surveillance, signing, trading, and execution semantics.

The proposed change only hardens watchdog renewal cadence and improves derived diagnostics. It does not change:

- lease duration;
- expiry condition;
- writer ownership;
- cursor advancement;
- evidence persistence;
- checkpoint authority;
- production authority;
- recovery semantics.

No Contract Amendment is required.

## Analysis conclusion

A shorter default renewal cadence reduces the scheduling margin consumed between successful renewals without changing the lease or expiry contract. The default periodic cadence will move from lease/4 to lease/8. Explicit caller-provided intervals remain unchanged.

The implementation must also preserve the current watchdog-exclusive renewal boundary; main-thread renewal must remain disabled while the watchdog is active.

Additional worker runtime diagnostics should expose enough information to distinguish a missed timer interval from an actual renewal operation failure, while remaining derived and non-authoritative.

## Required validation

Tests must prove:

1. default watchdog interval is lease/8;
2. explicit interval overrides remain honored;
3. watchdog remains the sole renewal path during ingestion;
4. renewal diagnostics remain fail-closed and derived-only;
5. cursor does not advance on fence expiry/failure;
6. existing blocked-event-loop and contention regressions remain valid;
7. no lease-duration or expiry-rule behavior changes.

## Non-goals

- no lease-duration increase;
- no expiry-rule change;
- no cursor reset;
- no evidence deletion or rewrite;
- no authority expansion;
- no fallback authority;
- no V4 activation;
- no Surveillance authority;
- no trading/signing/execution;
- no claim that UNKNOWN root cause has been resolved before fresh operator evidence proves it.
