# H-04 Durability & Crash Recovery Verification Checkpoint

Status: VERIFIED AT TEST BOUNDARY — GATE 2 REMAINS OPEN

## Scope

This checkpoint records executable evidence for the H-04 durability boundary on the F-02D integration branch. It does not authorize V4 production cutover.

## Verified invariants

1. Evidence processing completes before the ingestion engine advances the cursor.
2. A simulated crash after evidence commit leaves the cursor at the prior durable boundary.
3. Durable evidence remains available after the failed run and can be replayed on restart.
4. A new lease owner can resume from the durable evidence boundary.
5. A stale writer cannot advance the cursor after ownership changes.
6. If ownership is lost after durable evidence is written, evidence is preserved and cursor advancement is rejected.
7. Evidence commit failure leaves the cursor at the prior boundary.

## Executable evidence

- tests/f02d-ingestion-identity-durability.test.js
- tests/f02d-fencing-evidence-cursor-order.test.js
- tests/f02d-actual-engine-fencing-durability.test.js
- tests/f02d-restart-fencing-recovery.test.js

Relevant verified commits include:
- fae617b3d7fca3925175464db29c78fe166fdc0d
- 73ab2aeb693cb6233fa99587e6059491f01447ea
- 92fe58860bc72661803f6744df727267f027100e
- d0387d53baf44ef973389693a218b2c53c31df7b

## CI evidence

Commit d0387d53baf44ef973389693a218b2c53c31df7b completed successfully in the HAHAWEEK Security and Regression workflow.

The earlier failing fencing boundary was corrected by commit 92fe58860bc72661803f6744df727267f027100e, which also completed successfully.

## Boundary and limitation

The verified tests establish the H-04 ordering and recovery contract at the current ingestion seam. They do not by themselves prove final V4 checkpoint/manifest authority, full crash-consistent persistence semantics across every storage boundary, or production activation.

## Gate status

H-04: VERIFIED AT TEST BOUNDARY.

Design Gate 2: OPEN / NOT PASSED.

Production V4 activation: NOT AUTHORIZED.