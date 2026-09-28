# STEP 614 — Writer-Fence Watchdog Runtime Liveness Diagnostics Analysis v0.1

## Trigger

Actual operator runtime on main `092c4e70d8ba44b75a3ad5de405c887b86a91ea3` failed with `WRITER_FENCE_EXPIRED` after VERIFIED/AUTHORIZED processing.

Post-failure evidence at 2026-09-28 10:59 WIB and again at 12:30 WIB showed:

- no HAHAWEEK/Node process;
- no writer-fence lock file;
- durable writer-fence state `ownerId=NONE`, `fence=76`, `expiresAt=0`;
- durable operational state `FAILED / BLOCKED`;
- `lastVerifiedCursor=64989296`;
- current persisted cursor `64989376`;
- recovery required;
- repository HEAD and origin/main both `092c4e70d8ba44b75a3ad5de405c887b86a91ea3`.

The evidence establishes a fail-closed terminal state and a clean post-failure writer fence, but does not establish why the watchdog missed renewal before the 30-second lease expired.

## Root-Cause Boundary

The current implementation uses a worker-thread watchdog with a `setInterval` timer. The watchdog performs an immediate renewal and then renews at lease/4 by default. Node.js documents that timer callbacks are not guaranteed to execute at an exact requested time. Worker threads execute JavaScript in independent threads/event loops, but this does not prove immunity from host scheduling or storage delays.

Therefore the remaining runtime defect is classified as:

**WATCHDOG LIVENESS CAUSE = UNKNOWN / UNPROVEN**

Possible domains remain:

1. worker scheduling delay;
2. host/runtime suspension or throttling;
3. filesystem lock/write latency;
4. clock behavior;
5. another ownership/lifecycle interaction.

No one of these is selected without runtime evidence.

## Contract Check

The existing authorized STEP 614 Contract permits bounded diagnostics and reliability remediation for operator usability, failure diagnosis, recovery, and durable operational state, while forbidding changes to evidence, authority, cursor, checkpoint, CBDR, V4, Surveillance authority, or execution semantics.

This diagnostic change does not alter lease duration, expiry rules, writer ownership, cursor advancement, evidence handling, or authority.

No Contract Amendment is required.

## Diagnostic Objective

Capture runtime evidence sufficient to distinguish:

- timer/scheduling delay;
- renewal execution delay;
- renewal operation duration;
- renewal failure cause;
- time between successful renewal and lease expiry;
- worker readiness and shutdown state.

Diagnostics must remain derived, in-memory/terminal observability only. They must not become processing authority or alter persistence semantics.

## Required Invariants

1. Writer owner/fence identity remains unchanged.
2. Expired fences cannot be resurrected.
3. Watchdog remains the sole periodic renewal path while active.
4. Immediate renewal behavior remains unchanged.
5. Lease duration and expiry rule remain unchanged.
6. Renewal failure remains sticky and fail-closed.
7. Cursor advancement remains after verified processing and authority only.
8. No evidence or checkpoint rewrite/deletion is introduced.
9. Operational failure persistence remains derived-only.
10. Diagnostic metadata cannot authorize processing.

## Diagnostic Evidence Model

For each watchdog run, retain runtime-only diagnostic fields:

- leaseMs;
- intervalMs;
- startedAt;
- readyAt;
- renewalCount;
- lastRenewScheduledAt;
- lastRenewStartedAt;
- lastRenewCompletedAt;
- lastRenewDurationMs;
- lastRenewedAt;
- lastRenewFailureAt;
- lastRenewFailureCode;
- lastRenewFailureDelayMs.

A renewal tick will record its expected/scheduled timestamp before execution and its actual start/completion timestamps. This permits post-failure classification without changing the lease contract.

## Acceptance for This Diagnostic Change

Repository tests must prove:

- diagnostics are populated for immediate and periodic renewal;
- renewal count increments only on successful renewal;
- renewal failure captures a concrete cause;
- existing fail-closed behavior remains intact;
- existing blocked-event-loop watchdog test remains valid;
- no cursor/evidence/authority behavior changes.

Actual operator runtime must then capture the diagnostic output. If the evidence still cannot identify the cause, the result remains UNKNOWN and no semantic lease change is authorized.

## Non-Goals

- no lease-duration increase;
- no expiry-rule change;
- no retry-policy change;
- no cursor reset;
- no authority expansion;
- no evidence rewrite/deletion;
- no fallback authority;
- no V4 activation;
- no Surveillance authority;
- no trading/signing/execution.
