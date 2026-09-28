# STEP 614 — Writer-Fence Watchdog Liveness & Failure-State Recovery Design v0.1

## Objective

Remove the avoidable watchdog startup/scheduling gap and ensure a terminal writer-fence failure is durably diagnosable without bypassing writer-fence authority for processing data.

## Design

### A. Immediate watchdog renewal

The watchdog worker will perform one synchronous renewal immediately after startup.

It will emit `ready` only after that renewal succeeds.

If the immediate renewal fails, the worker reports the concrete cause and exits; the parent rejects watchdog startup rather than entering ingestion with an unrefreshed lease.

### B. Additional renewal margin

The default watchdog interval changes from lease/3 to lease/4.

This does not change the 30-second lease, expiry semantics, owner identity, or fence sequencing. It only increases renewal margin against normal timer scheduling variance.

Explicit caller-supplied intervals remain supported and validated.

### C. Sticky failure remains fail-closed

Post-start renewal failures continue to become the existing sticky `WRITER_FENCE_WATCHDOG_RENEWAL_FAILED` error.

`assertOwned()` continues to fail closed.

No expired fence is resurrected.

### D. Terminal operational failure persistence

`src/index.js` will retain the current fenced state-write attempt first.

If that write fails because the active fence can no longer authorize the derived operational-state write, the process will release its obsolete fence and use the repository's existing `persistOperationalFailure()` helper to acquire a fresh fence and persist the failure.

This fallback is restricted to operational-state diagnosis. It does not write cursor, checkpoint, evidence, canonical lineage, or authority records.

### E. Tests

Add coverage for:

- immediate watchdog renewal extending the lease before readiness;
- startup renewal failure rejecting readiness with concrete cause;
- existing main-event-loop blocking watchdog test;
- existing watchdog failure propagation test;
- expired active fence fallback through `persistOperationalFailure()`;
- preservation of last verified cursor and fail-closed classification.

## Security / Boundary

The fresh operational-state writer fence is a new operational-state writer identity only. It cannot become processing authority because processing state remains guarded by the normal runtime writer fence and authority gate.

No historical evidence is rewritten.

## Operator Result

After failure, `status` must show the terminal failure class/code rather than stale `RUNNING / INITIALIZING`, while preserving the last verified cursor.

## Acceptance

The implementation is acceptable only if repository tests and security/regression tests pass and a fresh operator runtime on the merged main demonstrates:

- sustained VERIFIED/AUTHORIZED processing;
- no writer-fence busy/expired failure during the verified runtime window;
- truthful terminal failure state if a writer-fence failure is deliberately exercised;
- restart/recovery continuity;
- no unauthorized cursor movement.
