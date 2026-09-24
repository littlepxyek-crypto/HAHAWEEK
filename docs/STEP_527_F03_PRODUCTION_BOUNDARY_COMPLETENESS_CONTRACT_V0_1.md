# STEP 527 — F-03 Production Boundary Completeness Contract v0.1

Status: CONTRACT — PENDING IMPLEMENTATION

## Purpose

Define the final evidence boundary needed to determine whether F-03 can be closed without falsely treating offline authority helpers as production V4 cutover.

## Required production-boundary properties

1. The actual ingestion cursor-advance boundary must consume an authority record, not a boolean-only acknowledgement.
2. Authority must bind segment identity, manifest identity/digest, checkpoint identity/digest, generation, and cursor position.
3. Missing, malformed, stale, conflicting, or mismatched authority must fail closed before cursor advancement.
4. Restart must recover the same persisted authority generation and cursor position.
5. Authority regression must be rejected.
6. Evidence persistence must precede cursor authority.
7. Tests must exercise the current production ingestion boundary.

## Acceptance

F-03 may be marked VERIFIED/FROZEN only if executable tests demonstrate these properties at the current production boundary.

## Non-goals

No live V4 activation, RPC/provider change, SQLite migration, historical rewrite, or cursor reset is permitted by this contract.
