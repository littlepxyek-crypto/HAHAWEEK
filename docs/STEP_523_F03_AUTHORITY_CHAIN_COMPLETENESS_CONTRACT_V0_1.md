# STEP 523 — F-03 Authority Chain Completeness Contract v0.1

Status: CONTRACT — PENDING VERIFICATION

## Purpose

Determine whether the STEP 522 checkpoint-before-cursor guard is sufficient to establish the complete F-03 authority chain required by Design Gate 2.

## Required authority chain

`SEGMENTS → MANIFEST → CHECKPOINT → CURSOR`

## Required evidence

1. Segment inputs are identified and committed before manifest authority.
2. Manifest identity/digest is bound to the checkpoint.
3. Checkpoint identity/digest is bound to the cursor position.
4. Cursor advancement is rejected when any predecessor authority is missing, stale, malformed, conflicting, or mismatched.
5. Restart/recovery reconstructs the same authoritative position.
6. Competing generations cannot silently supersede one another.
7. Negative and recovery tests execute against the actual current authority boundary.

## STEP 522 relationship

STEP 522 proves only the narrow checkpoint-before-cursor ordering guard. It does not by itself prove the complete four-stage authority chain.

## Non-goals

No V4 production activation, RPC change, schema migration, cursor reset, historical rewrite, or authority cutover is performed by this contract.

## Acceptance

F-03 can become VERIFIED/FROZEN only after executable evidence covers the complete authority chain at the applicable production boundary. Otherwise it remains CONDITIONAL.
