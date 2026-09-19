# V4 Offline Recovery Verifier

Status: IMPLEMENTED ON BRANCH / REVIEW REQUIRED

## Purpose

This verifier is an offline reference checkpoint for the V4 recovery authority chain. It does not ingest production data, persist cursors, mutate SQLite, advance acquisition state, or perform migration.

## Verification order

1. Verify checkpoint input lexical form and exact key set.
2. Verify the referenced manifest exists and its hash and generation match the checkpoint.
3. Verify manifest inventory and referenced segments.
4. Recompute the canonical V4 checkpoint hash.
5. Verify cursor lexical form and exact key set.
6. Require cursor.checkpoint_hash to equal the verified checkpoint hash.
7. Require cursor.generation <= checkpoint.generation.
8. Recompute the canonical V4 cursor hash.
9. Require acquisition-specific position validation before resume.

Any failed condition rejects recovery; there is no repair, fallback, latest-file selection, coercion, or cursor reset.

## Boundary

The generic cursor position remains opaque. Mapping a position to block ranges, provider pagination, transaction/log coordinates, or another acquisition cursor belongs to the applicable acquisition contract and is not implemented here.

## Test relationship

The executable checkpoint/cursor/recovery vectors remain the normative test data. The verifier tests consume the same vectors so the reference implementation and golden vectors stay coupled without touching production runtime code.
