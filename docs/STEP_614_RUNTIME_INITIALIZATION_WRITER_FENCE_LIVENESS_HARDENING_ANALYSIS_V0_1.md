# STEP 614 — Runtime Initialization Writer-Fence Liveness Hardening Analysis v0.1

## Trigger

Fresh operator evidence on current main `12bbc70c01676a369e6267482bd2f8ad70ae5981` established:

1. Recovery from `ETIMEDOUT` successfully resumed verified/authorized ingestion through cursor `64991446`.
2. A subsequent provider timeout was classified `PROVIDER_UNAVAILABLE` and retried.
3. On the retry cycle, health reported `DEGRADED`, then operational-state persistence failed with `WRITER_FENCE_EXPIRED`; fallback persisted the writer-fence failure and the runner stopped fail-closed.

The observed watchdog diagnostics for the preceding successful scan showed lease 30000ms and watchdog interval 3750ms, with no recorded watchdog renewal failure. Therefore the latest failure cannot be attributed to a watchdog renewal failure from that diagnostic alone.

## Current repository findings

The current `src/index.js` acquires the writer fence in `createEngine()`, then performs asynchronous initialization including database creation and production-authority lifecycle reconciliation, but does not start the writer-fence watchdog until `IngestionEngine.runOnce()`.

The current `src/core/single-writer-fence.js` watchdog is an independent worker-thread timer and performs an immediate renewal before readiness. Node.js documents worker threads as independent JavaScript execution threads with their own event loops and exposes worker event-loop utilization; Node.js also documents that timer callback timing varies with event-loop work.

The resulting bounded liveness gap is:

`acquire()` → initialization/reconciliation → `runOnce()` → watchdog start

During the pre-`runOnce()` interval, the acquired 30-second fence is protected only by its fixed lease. A sufficiently slow initialization/reconciliation period can therefore expire the fence before the watchdog is active. The observed retry-cycle `WRITER_FENCE_EXPIRED` during initialization is consistent with this failure boundary, but the exact elapsed initialization duration was not captured by the current runtime evidence. Root cause is therefore classified as **strongly suspected / not yet directly timed** rather than proven.

## Impact

- No cursor reset was observed.
- The last verified cursor `64991446` was produced by a VERIFIED/AUTHORIZED scan and must remain authoritative until later evidence is independently verified.
- Durable evidence and failure state are preserved.
- The failure is isolated to runtime writer-fence/liveness handling.
- Global LIVE readiness remains blocked.

## Contract boundary

The existing STEP 614 Contract permits bounded operator-runtime reliability remediation while forbidding changes to lease duration, expiry semantics, writer ownership, cursor authority, evidence authority, checkpoint authority, V4, Surveillance, signing, trading, execution, or historical evidence.

The proposed remediation therefore targets only the **activation boundary of the already-authorized watchdog**: the watchdog must begin protecting the acquired writer lease before long asynchronous engine initialization begins.

## Non-goals

- No lease-duration change.
- No expiry-rule change.
- No new authority.
- No cursor or evidence mutation.
- No fallback authority.
- No retry-policy semantic expansion.
- No historical rewrite.
- No trading/signing/execution.

## Acceptance evidence required

Repository lifecycle evidence must show:
- deterministic test that a watchdog remains alive while the main thread is blocked for longer than the lease;
- deterministic test for initialization-time protection or equivalent lifecycle integration;
- existing full test and security/regression suites remain green;
- review, merge, post-merge verification, reconciliation, and documentation are completed;
- fresh current-main operator runtime demonstrates recovery, cursor continuity, provider-failure isolation, and sustained writer-fence liveness.

## Status

ANALYSIS — VERIFIED FOR DESIGN.

Global LIVE-READINESS remains NOT READY / BLOCKED / FAIL-CLOSED until fresh operator evidence satisfies the existing gate.
