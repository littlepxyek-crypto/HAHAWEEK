# STEP 614 — Writer-Fence Runtime Liveness Hardening Design v0.1

## Objective

Increase the watchdog's timing margin against observed runtime liveness failures without changing the frozen writer-fence lease or expiry semantics.

## Design

### 1. Default cadence

Change the watchdog's default periodic renewal interval from:

`floor(leaseMs / 4)`

to:

`floor(leaseMs / 8)`

with a minimum of 1 ms.

For the current 30,000 ms lease this changes the default cadence from 7,500 ms to 3,750 ms.

An explicit `intervalMs` supplied by a caller remains authoritative and unchanged.

### 2. Renewal authority

The watchdog remains the sole renewal mechanism whenever `startWatchdog()` succeeds.

The main-thread heartbeat and batch-boundary renewals remain disabled for watchdog-capable ingestion. This preserves the prior contention remediation.

### 3. Diagnostics

Preserve all existing diagnostic fields and add derived worker-side timing information sufficient to distinguish:

- scheduled-to-start delay;
- wall-clock elapsed renewal duration;
- monotonic elapsed renewal duration;
- worker event-loop utilization snapshot where supported.

Diagnostics are terminal/in-memory observability only. They cannot authorize processing, advance the cursor, or modify evidence.

### 4. Failure behavior

Any renewal failure remains sticky and fail-closed.

An expired writer fence remains `WRITER_FENCE_EXPIRED`.

The expiry rule itself is unchanged:

`current.expiresAt <= current timestamp` means the fence is expired.

No grace period, lease extension, or stale-fence resurrection is introduced.

### 5. Recovery boundary

No recovery shortcut is added.

Existing sequence remains:

LAST VERIFIED STATE
→ VERIFY DURABLE STATE
→ RECOVER
→ TEST
→ VERIFY
→ CONTINUE

## Test design

Add deterministic coverage for:

- default cadence equals lease/8;
- explicit interval remains unchanged;
- successful periodic renewal increments diagnostics;
- monotonic elapsed timing is non-negative;
- worker diagnostics remain derived;
- watchdog-exclusive renewal remains intact;
- forced renewal failure remains sticky/fail-closed;
- cursor remains unchanged when the fence fails.

Existing tests for blocked main event loop, contention, stale fence, malformed state, and cursor barriers remain required.

## Security boundary

No changes to:

- authority;
- evidence;
- cursor;
- checkpoint;
- raw/canonical data;
- production V4;
- Surveillance;
- actor inference;
- signing/trading/execution.

External runtime conditions remain untrusted.

## Acceptance

Repository CI must pass Tests and Security/Regression.

Fresh operator runtime on resulting current main must still be required. The hardening is not considered a live-readiness proof until actual operator evidence demonstrates sustained watchdog liveness, recovery, and cursor/evidence continuity.
