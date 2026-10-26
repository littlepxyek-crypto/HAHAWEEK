# STEP 521 — F-03 Production Authority Cutover Contract v0.1

Status: CONTRACT — PENDING VERIFICATION

## Purpose

Define the missing evidence boundary for F-03: enforceable authority ordering between V4 checkpoint/cursor state and production processing.

## Scope

This step is limited to proving that production authority cannot advance the cursor from an uncommitted, stale, malformed, inconsistent, or otherwise non-authoritative checkpoint state.

## Required evidence

1. Explicit authority chain: SEGMENTS → MANIFEST → CHECKPOINT → CURSOR.
2. Production boundary rejects malformed or stale authority.
3. Cursor cannot advance before required evidence/checkpoint durability.
4. Restart/recovery preserves the authoritative persisted position.
5. Authority cannot regress silently.
6. Conflicting generations/digests fail closed.
7. Tests exercise the production boundary against current `main`.
8. Evidence is deterministic and reproducible.

## Non-goals

- No live V4 activation.
- No RPC/provider change.
- No historical data rewrite.
- No SQLite schema migration.
- No cursor reset.
- No replacement of existing production authority before Gate 2 PASS.

## Acceptance

F-03 may only move beyond CONDITIONAL when the repository contains executable evidence at the actual authority boundary, not merely an independent offline verifier.
