# HAHAWEEK V4 — Normative Cursor Input Contract

Status: NORMATIVE — STEP 3C-K
Protocol: HAHAWEEK-EVIDENCE-V4

## 1. Scope

This document freezes the integrity-critical cursor input boundary used only as a recoverable progress projection.

It does not make the cursor an authority source. Cursor authority remains subordinate to verified segments, manifest, and checkpoint authority.

It does not authorize production cursor handling and does not modify production ingestion, runtime state, SQLite state, legacy evidence, migration state, live acquisition, or production recovery.

The cursor object belongs to the HAHAWEEK-EVIDENCE-V4-CURSOR domain.

## 2. Exact cursor input object

The cursor input object MUST contain exactly these three keys:

- generation
- checkpoint_hash
- position

Unknown keys MUST be rejected. Missing keys MUST be rejected. No defaulting, coercion, normalization, or alternate encoding is permitted.

All three values MUST be strings.

The cursor hash is derived from this exact input object and is stored/referenced separately as the cursor digest.

## 3. Field contract

### 3.1 generation

generation identifies the manifest generation against which this cursor position was recorded.

It is a V4 unsigned 64-bit integer encoded as a canonical JSON string.

Canonical lexical form: 0 or [1-9][0-9]*.
Numeric range: 0 <= generation <= 18446744073709551615.
No leading zero, sign, decimal point, whitespace, alternate numeric type, or overflow is permitted.

### 3.2 checkpoint_hash

checkpoint_hash binds the cursor to the exact checkpoint whose authority boundary it claims to project.

It MUST be a string, lowercase hexadecimal, 0x-prefixed, exactly 32 bytes / 64 hexadecimal characters, with no uppercase characters or alternate encodings.

The value MUST equal the verified V4 checkpoint hash used during recovery.

### 3.3 position

position is the cursor's canonical progress coordinate within the referenced manifest generation.

It is a V4 unsigned 64-bit integer encoded as a canonical JSON string.

Canonical lexical form: 0 or [1-9][0-9]*.
Numeric range: 0 <= position <= 18446744073709551615.
No leading zero, sign, decimal point, whitespace, alternate numeric type, or overflow is permitted.

The precise mapping between position and an acquisition-specific resume coordinate MUST be defined by the applicable acquisition contract before production cursor use.

This cursor contract therefore MUST NOT be interpreted as defining block numbers, transaction indexes, provider pagination, or any other acquisition-specific coordinate.

## 4. Cursor hash

cursor_hash = hash(HAHAWEEK-EVIDENCE-V4-CURSOR, cursor_input_object).

Generic V4 hash primitive:

SHA256( UTF8(domain) || 0x00 || RFC8785_JCS(input_object) ).

The hash MUST be calculated from exactly the three normative keys above.

No language-native JSON serialization, implicit field insertion, alternate encoding, or derived object may be substituted.

The resulting digest is represented as lowercase 0x-prefixed 32-byte hexadecimal.

## 5. Authority semantics

A cursor is a projection of committed recovery state, not an independent source of truth.

A cursor MUST NOT authorize evidence, manifest contents, checkpoint contents, canonicality, or production progress by itself.

Cursor authority is established only after:

1. the referenced checkpoint is verified as authoritative;
2. the checkpoint manifest is verified;
3. all required referenced segments verify;
4. the cursor input object passes the exact-key and lexical contract;
5. the cursor hash matches its canonical input;
6. cursor.generation <= checkpoint.generation;
7. cursor.checkpoint_hash equals the verified checkpoint hash.

The authoritative chain remains: verified segments -> verified manifest -> verified checkpoint -> verified cursor projection.

## 6. Generation and checkpoint binding

For recovery, cursor.generation <= checkpoint.generation MUST hold.

Additionally, cursor.checkpoint_hash == verified checkpoint_hash MUST hold.

A cursor with a greater generation or different checkpoint hash MUST fail closed.

The cursor MUST NOT be accepted merely because its own digest is internally valid.

## 7. Duplicate and collision policy

For a cursor identity derived from its exact input object:

same identity + same digest = IDEMPOTENT
same identity + different digest = INTEGRITY_CONFLICT

An integrity conflict MUST fail closed.

A storage primitive such as INSERT OR IGNORE MUST NOT replace this policy.

A cursor update MUST NOT silently replace an earlier cursor without preserving the integrity-relevant record and applying the applicable recovery/write protocol.

## 8. Fail-closed conditions

The verifier MUST reject missing keys, unknown keys, wrong types, non-canonical or overflowing generation/position values, invalid checkpoint hashes, cursor hash mismatch, missing or unverifiable checkpoint, checkpoint mismatch, cursor generation greater than checkpoint generation, conflicting duplicate cursor identity, and any acquisition-specific position that cannot be mapped deterministically.

No automatic repair or silent normalization is permitted.

## 9. Independence

The reference cursor validator MUST NOT import production ingestion, legacy raw-store code, SQLite runtime state, production cursor code, live RPC provider code, or production migration code.

It must operate deterministically from supplied cursor, checkpoint, manifest, and segment verification inputs.

## 10. Required executable vectors

Positive vectors MUST cover valid generation, checkpoint hash, position, cursor hash, cursor-to-checkpoint binding, equal and lower cursor generation, maximum uint64 generation, maximum uint64 position, and idempotent duplicate.

Negative vectors MUST cover missing/unknown keys, wrong types, leading zeros, signed values, overflow, invalid checkpoint hash, hash mutation, cursor digest mutation, checkpoint mismatch, missing/invalid checkpoint, cursor generation greater than checkpoint generation, conflicting duplicate identity, and unresolved acquisition-specific position mapping.

## 11. Recovery interaction

Recovery MUST establish checkpoint authority before accepting cursor authority.

Required ordering:

1. verify manifest;
2. verify referenced segments;
3. verify checkpoint;
4. verify checkpoint-to-manifest linkage and generation;
5. verify cursor;
6. verify cursor checkpoint hash equals the verified checkpoint hash;
7. verify cursor generation does not exceed checkpoint generation;
8. verify position using the applicable acquisition contract;
9. resume only if all invariants pass;
10. otherwise fail closed.

The cursor contract MUST NOT weaken manifest, segment, checkpoint, or transition invariants.

## 12. Production boundary

This contract does not authorize production cursor persistence, cursor reset, cursor migration, legacy cursor conversion, live acquisition changes, SQLite schema changes, or production recovery changes.

Any such implementation requires a separate reviewed change after executable vectors and the recovery verifier exist.

## 13. Gate 2

Design Gate 2 remains OPEN.

This contract freezes the cursor input boundary only. It does not implement production cursor handling.

## 14. Next

Implement executable checkpoint/cursor/recovery vectors and an offline recovery verifier, while keeping acquisition-specific cursor mapping separate until its acquisition contract is frozen.

## 15. Reference

RFC 8785 JCS is the canonical JSON serialization basis for the V4 hash primitive. V4 additionally requires explicit blockchain/hash lexical forms defined by the protocol.