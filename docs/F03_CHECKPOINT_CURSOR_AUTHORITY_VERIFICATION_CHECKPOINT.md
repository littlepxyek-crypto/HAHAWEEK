# F-03 Checkpoint / Cursor Authority Verification Checkpoint

Date: 2026-09-21
Branch: feat/v4-checkpoint-authority-boundary

## Status

**F-03 VERIFIED AT TEST BOUNDARY — DESIGN GATE 2 REMAINS OPEN**

F-03 is verified at the executable test boundary covered below. This does not authorize production V4 cutover.

## Verification evidence

### F-03A — V4 recovery authority seam

- V4 checkpoint, cursor, manifest, and acquisition-position authority rules are exercised through the recovery seam.
- Valid authority returns RECOVERY_RESUME_ALLOWED.
- Missing checkpoint, stale/mismatched authority, cursor-ahead state, and corrupt segment cases fail closed.
- Recovery is side-effect free and does not silently repair or reset state.
- Test: tests/f03-v4-recovery-seam.test.js
- CI: run #551 — success.

### F-03B — actual cursor boundary

- The actual BlockCursor is exercised against the recovery seam.
- Failed recovery leaves the persisted cursor unchanged.
- A crash boundary is represented by durable evidence existing before cursor advancement.
- Restart restores the prior cursor boundary.
- Test: tests/f03b-actual-cursor-recovery.test.js
- CI: run #553 — success.

### F-03C — durable crash / restart / replay

- The actual sql.js database is used for durable raw evidence.
- Evidence is persisted before the simulated crash boundary.
- Cursor remains at the previous boundary when cursor commit is not reached.
- Restart reads the same durable evidence.
- Replaying the same event is idempotent and does not duplicate the evidence.
- Cursor advances only after replay/verification.
- Evidence persistence failure does not advance the cursor.
- Test: tests/f03c-sqljs-crash-restart-replay.test.js
- CI: run #555 — success.

## F-03 invariants verified

1. Cursor cannot advance merely because recovery is attempted.
2. Failed recovery is fail-closed.
3. Recovery does not silently reset or mutate the cursor.
4. Durable evidence can survive a crash before cursor commit.
5. Restart can observe the durable evidence.
6. Identical replay is idempotent at the raw-event store boundary.
7. Evidence failure leaves the cursor at its previous boundary.
8. Cursor advancement remains a separate persistence action.

## Scope limitation

This checkpoint verifies the F-03 authority and recovery boundary covered by the current executable tests. It does not by itself prove the complete V4 checkpoint/manifest production authority path, every storage durability boundary, or production cutover readiness.

## Gate 2 disposition

**DESIGN GATE 2: OPEN / NOT PASSED**

F-03 is no longer the immediate blocker at this test boundary. Remaining Gate 2 work includes the other F-01/F-02/F-04/F-05 and H-series acceptance criteria, including legacy write freeze, migration verification, RPC acquisition provenance, collision isolation, single-writer/fencing, durability boundaries, and complete offline verification.

## Continuity rule

Future work must preserve historical evidence, the canonical blueprint, fail-closed recovery, no silent cursor reset, no silent mutation/deletion, separation of raw evidence from derived data and interpretation, and executable verification before production authority changes.
