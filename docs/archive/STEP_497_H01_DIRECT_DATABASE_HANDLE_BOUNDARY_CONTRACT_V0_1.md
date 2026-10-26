# STEP 497 — H-01 Direct Database Handle Boundary Contract v0.1

Status: CONTRACT — PENDING VERIFICATION

## Purpose

Close the H-01 coverage gap identified after STEP 496: a production caller can currently obtain the underlying SQL.js database handle through `database.db` and potentially execute a direct mutation without traversing the shared legacy write barrier.

## Boundary

After `LEGACY_FROZEN`:

1. No production legacy persistence path may permit a direct database mutation that bypasses the legacy write barrier.
2. A database handle exposed for reads must not provide an unguarded production write path.
3. Existing legacy behavior before freeze must remain unchanged.
4. Freeze-state validation remains fail-closed.
5. A blocked mutation must not advance cursor/checkpoint state or alter persisted evidence.
6. No V4 authority activation is part of this step.

## Required evidence

### Positive
- Existing legacy read/query behavior continues to work.
- Existing approved legacy writes work while `LEGACY_ACTIVE`.
- Controlled database persistence continues to work while active.

### Negative
- Direct production-path database mutation is rejected after `LEGACY_FROZEN`.
- A frozen barrier cannot be bypassed through an exposed/internal database handle.
- A rejected mutation leaves the database state and persisted bytes unchanged.
- Cursor/state cannot advance because of a blocked database write.
- Malformed or unknown freeze state fails closed.
- Reinitialization preserves the freeze state.

## Non-goals

- No V4 semantic changes.
- No SQLite schema migration.
- No RPC changes.
- No raw historical deletion or rewriting.
- No cursor reset.
- No checkpoint authority change.
- No production V4 cutover.
- No predictive/ranking/trading/signing/publication behavior.

## Acceptance

H-01 may be declared VERIFIED/FROZEN only after implementation, negative tests, full test/security verification, and exact post-merge evidence establish that the direct database handle cannot bypass the freeze boundary.

If the implementation requires a new semantic boundary, all changes must remain within this contract.