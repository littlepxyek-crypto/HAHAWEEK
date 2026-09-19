# V4 Offline Recovery Verifier

Status: IMPLEMENTED ON BRANCH / REVIEW REQUIRED

## Purpose

This verifier is an offline reference checkpoint for the V4 recovery authority chain. It does not ingest production data, persist cursors, mutate SQLite, advance acquisition state, or perform migration.

It verifies both the canonical input objects and the separately stored checkpoint/cursor digests. A valid input object alone is not sufficient to establish recovery authority.

## Verification order

1. Verify checkpoint record shape and stored digest.
2. Verify checkpoint input lexical form and exact key set.
3. Verify the referenced manifest exists and its hash and generation match the checkpoint.
4. Verify manifest inventory and referenced segments.
5. Recompute and compare the canonical V4 checkpoint hash.
6. Verify cursor record shape and stored digest.
7. Verify cursor lexical form and exact key set.
8. Require cursor.checkpoint_hash to equal the verified checkpoint hash.
9. Require cursor.generation <= checkpoint.generation.
10. Recompute and compare the canonical V4 cursor hash.
11. Require acquisition-specific position validation before resume.

Any failed condition rejects recovery; there is no repair, fallback, latest-file selection, coercion, or cursor reset.

## Record boundary

The normative checkpoint and cursor input contracts define the exact hashed input objects. The verifier additionally accepts their stored digest as a separate record field:

    checkpoint record = { input, hash }
    cursor record     = { input, hash }

The stored digest MUST equal the recomputed domain-separated V4 hash of the exact input object.

## Boundary

The generic cursor position remains opaque. Mapping a position to block ranges, provider pagination, transaction/log coordinates, or another acquisition cursor belongs to the applicable acquisition contract and is not implemented here.

## Test relationship

The executable checkpoint/cursor/recovery vectors remain the normative test data. The verifier tests consume the same vectors so the reference implementation, stored-digest boundary, and golden vectors stay coupled without touching production runtime code.

## Scope limitation

Manifest and segment verification are currently supplied as verified inputs to the reference verifier. Their byte-level identity/body/seal contracts are a subsequent V4 layer and are not invented by this verifier.
