# STEP 614 — Writer-Fence Watchdog Failure Propagation Analysis v0.1

## Trigger

Fresh operator evidence on merge commit `b8f9c4820c87d35209c86a0a760c682f5c9b66b9` reproduced `WRITER_FENCE_EXPIRED` after successful processing of ranges `64988767-64988776`, `64988777-64988786`, and `64988787-64988796`.

The same runtime showed:

- no active Node/HAHAWEEK process after termination;
- no remaining writer-fence lock file;
- system clock and fence expiry were consistent;
- durable fence state was expired;
- durable operational state retained an earlier `WRITER_FENCE_BUSY` failure;
- the later `WRITER_FENCE_EXPIRED` failure could not replace that state because state persistence requires an owned writer fence.

## Root Cause Boundary

The watchdog worker currently catches renewal errors and posts an error message to the parent thread, but the main ingestion path does not consume watchdog error messages as a fail-closed runtime signal.

Therefore a watchdog can remain alive while renewal is failing. The main thread only discovers the lost lease at a later `assertOwned()` boundary, after the lease may already have expired.

This is a liveness/observability defect inside the existing writer-fence mechanism. It does not change writer ownership, fence identity, expiry semantics, cursor authority, evidence semantics, checkpoint semantics, authority lifecycle, Surveillance authority, or execution semantics.

## Failure-State Persistence Finding

`saveState()` requires `legacyWriteBarrier.assertWritable()`, which in turn requires `writerFence.assertOwned()`. Once the writer fence has expired, persisting the subsequent operational failure can itself fail with `WRITER_FENCE_EXPIRED`.

The durable `WRITER_FENCE_BUSY` therefore represents the last successfully persisted failure, not necessarily the terminal error printed by the process.

This preserves fail-closed behavior but leaves a diagnostic observability gap.

## Contract Assessment

The existing STEP 614 Live-Readiness / Actual Operator Runtime Contract explicitly requires:

- visible and diagnosable failures;
- fail-closed behavior when authority is uncertain;
- durable recovery state;
- operator ability to identify failure;
- no invented or rewritten evidence.

Propagating a watchdog renewal failure to the main ingestion path is within this contract. No Contract Amendment is required.

## Required Invariants

1. Successful watchdog renewal remains the only periodic renewal path while the watchdog is active.
2. A watchdog renewal failure becomes observable to the ingestion owner.
3. The ingestion path fails closed at the next safe boundary after watchdog failure.
4. No cursor advancement occurs after a watchdog failure is observed.
5. No evidence is deleted or rewritten.
6. A stale/expired fence remains rejected.
7. Watchdog shutdown remains synchronized before release.
8. Existing non-watchdog fallback behavior remains unchanged.
9. A watchdog failure is distinguishable from provider/evidence failures.
10. Tests must exercise both watchdog renewal success and renewal failure propagation.

## Non-Goals

- No change to lease duration or expiry rules.
- No cursor reset.
- No change to authority semantics.
- No fallback authority.
- No historical mutation.
- No new surveillance or execution capability.
