# HAHAWEEK V4 — Normative Checkpoint Input Contract

Status: **NORMATIVE — STEP 3C-J**

Protocol: `HAHAWEEK-EVIDENCE-V4`

## 1. Scope

This document freezes the integrity-critical checkpoint input object required to bind a verified manifest generation into committed V4 authority.

It does not authorize production checkpoint handling and does not modify production ingestion, runtime state, SQLite state, cursor state, legacy evidence, migration state, or live acquisition.

The checkpoint object belongs to the `HAHAWEEK-EVIDENCE-V4-CHECKPOINT` domain.

## 2. Exact checkpoint input object

The checkpoint input object MUST contain exactly these two keys:

```text
generation
manifest_hash
```

Unknown keys MUST be rejected. Missing keys MUST be rejected. No defaulting, coercion, normalization, or alternate encoding is permitted.

Both values MUST be strings.

The checkpoint hash is derived from this exact input object and is stored/referenced separately as the checkpoint digest.

## 3. Field contract

### 3.1 generation

`generation` identifies the manifest generation committed by the checkpoint.

It is a V4 unsigned 64-bit integer encoded as a canonical JSON string.

Canonical lexical form:

```text
0
[1-9][0-9]*
```

Numeric range:

```text
0 <= generation <= 18446744073709551615
```

No leading zero, sign, decimal point, whitespace, alternate numeric type, or overflow is permitted.

The checkpoint generation MUST equal the referenced manifest generation.

### 3.2 manifest_hash

`manifest_hash` binds the checkpoint to one exact verified manifest.

It MUST be:

- a string;
- lowercase hexadecimal;
- `0x` prefixed;
- exactly 32 bytes / 64 hexadecimal characters;
- free of uppercase characters or alternate encodings.

The value MUST equal the canonical V4 hash of the verified manifest object.

A checkpoint referencing any other digest is invalid.

## 4. Checkpoint hash

The checkpoint hash is:

```text
checkpoint_hash =
  hash(
    HAHAWEEK-EVIDENCE-V4-CHECKPOINT,
    checkpoint_input_object
  )
```

using the V4 generic hash primitive:

```text
SHA256(
  UTF8(domain)
  || 0x00
  || RFC8785_JCS(input_object)
)
```

The hash MUST be calculated from exactly the two normative keys above.

No language-native JSON serialization, implicit field insertion, alternate encoding, or derived object may be substituted.

The resulting digest is represented as lowercase `0x`-prefixed 32-byte hexadecimal when stored or referenced as a V4 hash.

## 5. Authority semantics

A checkpoint is authoritative only when all of the following are true:

1. the checkpoint input object passes the exact-key and lexical contract;
2. its checkpoint hash matches its canonical input;
3. the referenced manifest exists;
4. the manifest hash matches `manifest_hash`;
5. the manifest bytes and integrity inventory verify;
6. the manifest generation equals `generation`;
7. all referenced segment identities and digests required by the manifest verify.

A checkpoint MUST NOT be treated as authoritative merely because its own hash is valid.

Checkpoint authority therefore binds:

```text
verified segments
      ↓
verified manifest
      ↓
checkpoint generation + manifest hash
      ↓
verified checkpoint
```

## 6. Generation authority

The checkpoint generation is the committed authority boundary used by later cursor recovery.

A cursor MAY NOT claim a generation greater than the verified checkpoint generation.

Therefore:

```text
cursor.generation <= checkpoint.generation
```

must hold during recovery.

A cursor that exceeds checkpoint generation MUST fail closed.

This establishes a deterministic comparison coordinate without introducing an additional checkpoint progress field.

## 7. Duplicate and collision policy

For a checkpoint identity derived from its exact input object:

```text
same identity + same digest = IDEMPOTENT
same identity + different digest = INTEGRITY_CONFLICT
```

An integrity conflict MUST fail closed.

A storage primitive such as `INSERT OR IGNORE` MUST NOT replace this policy.

A generation value alone is not sufficient to authorize arbitrary checkpoint bytes; the exact manifest binding and checkpoint digest remain integrity-critical.

## 8. Fail-closed conditions

The verifier MUST reject:

- missing key;
- unknown key;
- wrong value type;
- generation with leading zero;
- signed generation;
- generation overflow;
- invalid manifest hash;
- non-canonical manifest hash;
- checkpoint hash mismatch;
- missing manifest;
- manifest hash mismatch;
- manifest generation mismatch;
- unverifiable manifest inventory;
- unverifiable referenced segment;
- cursor generation greater than checkpoint generation;
- conflicting duplicate checkpoint identity.

No automatic repair or silent normalization is permitted.

## 9. Independence

The reference checkpoint validator MUST NOT import:

- production ingestion;
- legacy raw-store code;
- SQLite runtime state;
- production cursor code;
- live RPC provider code;
- production migration code.

It must operate deterministically from supplied checkpoint, manifest, and segment verification inputs.

## 10. Required executable vectors

### Positive

- valid generation;
- valid manifest hash;
- valid checkpoint hash;
- valid checkpoint-to-manifest generation binding;
- valid checkpoint-to-manifest hash binding;
- maximum uint64 generation;
- valid idempotent duplicate.

### Negative

- missing key;
- unknown key;
- wrong type;
- leading-zero generation;
- signed generation;
- overflow;
- invalid manifest hash;
- hash mutation;
- checkpoint digest mutation;
- manifest hash mismatch;
- generation mismatch;
- missing manifest;
- invalid manifest inventory;
- invalid referenced segment;
- conflicting duplicate identity;
- cursor generation greater than checkpoint generation.

## 11. Recovery interaction

Recovery MUST establish checkpoint authority before accepting cursor authority.

The required ordering remains:

1. verify manifest;
2. verify referenced segments;
3. verify checkpoint;
4. verify checkpoint-to-manifest linkage and generation;
5. verify cursor;
6. verify cursor generation does not exceed checkpoint generation;
7. resume only if all invariants pass;
8. otherwise fail closed.

The cursor contract is deliberately specified separately and MUST NOT weaken these checkpoint invariants.

## 12. Gate 2

Design Gate 2 remains **OPEN**.

This contract freezes the checkpoint input boundary only. It does not implement production checkpoint handling or cursor persistence.

## 13. Next

Freeze the normative V4 cursor input contract separately, then implement executable checkpoint/cursor/recovery vectors and an offline recovery verifier.

## 14. Reference

RFC 8785 JCS is the canonical JSON serialization basis for the V4 hash primitive. V4 additionally requires explicit blockchain/hash lexical forms defined by the protocol.
