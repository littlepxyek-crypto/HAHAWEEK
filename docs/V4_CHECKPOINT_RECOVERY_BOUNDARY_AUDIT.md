# HAHAWEEK V4 — Checkpoint / Recovery Boundary Audit

Status: **STEP 3C-I — AUDIT BEFORE CHECKPOINT/CURSOR VECTORS**

Protocol: `HAHAWEEK-EVIDENCE-V4`

## 1. Purpose

This audit freezes the currently established checkpoint/recovery invariants before any executable checkpoint, cursor, or recovery implementation is introduced.

The objective is to ensure that transition authority cannot be confused with manifest authority, checkpoint authority, or cursor projection.

This document does not modify production ingestion, runtime state, SQLite state, cursor state, raw evidence, migration state, or live acquisition.

## 2. Established authority chain

The V4 reference model establishes the authority relationship:

```text
SEGMENTS → MANIFEST → CHECKPOINT → CURSOR
```

The cursor is a projection of committed progress, not an independent authority.

Therefore:

- a cursor cannot authorize evidence by itself;
- a cursor cannot outrun checkpoint authority;
- a newer-looking cursor must not be selected merely because it has a larger value or newer timestamp;
- recovery must establish checkpoint authority before accepting cursor progress.

## 3. Manifest invariants

The manifest is the cumulative inventory authority for a generation.

Established requirements:

- manifest bytes must verify against its declared hash;
- the manifest inventory is integrity-relevant;
- any integrity-relevant inventory change changes the manifest hash;
- referenced segment identities and digests must be verified before checkpoint authority is accepted;
- a manifest generation is part of checkpoint linkage.

The reference model does not yet freeze an exact manifest object key set in this audit.

No manifest fields beyond already-established semantics should be invented in executable vectors.

## 4. Checkpoint invariants

A checkpoint commits a verified manifest state.

The following are established:

1. checkpoint bytes must verify against the checkpoint hash;
2. checkpoint.manifest_hash must equal the valid manifest hash;
3. checkpoint.generation must equal manifest.generation;
4. referenced manifest and segments must be verified before checkpoint authority is accepted;
5. a checkpoint is authoritative only when its linkage and generation invariants hold.

The exact checkpoint object key set, checkpoint identity fields, and checkpoint-specific lexical contract are **not yet frozen** by the reference model.

Therefore this audit does not invent those fields.

## 5. Cursor invariants

The cursor is a projection of committed progress.

Established requirements:

- cursor bytes must verify against the cursor hash;
- cursor must not exceed checkpoint authority;
- cursor authority is bounded by the verified checkpoint;
- malformed, stale, inconsistent, or ambiguous cursor state must not be accepted;
- recovery must never select a cursor merely because it is numerically largest, newest, or stored in a newer-looking file.

The exact cursor object key set, cursor identity fields, progress coordinate, and lexical contract are **not yet frozen** by the reference model.

## 6. Recovery algorithm

The current V4 reference model defines recovery in this exact order:

1. Verify manifest bytes and hash.
2. Verify referenced segment identities and digests.
3. Verify checkpoint bytes and hash.
4. Verify checkpoint-to-manifest linkage and generation.
5. Verify cursor bytes and hash.
6. Verify cursor does not exceed checkpoint authority.
7. Resume only when all invariants pass.
8. Otherwise enter fail-closed recovery.

This ordering is normative at the model level.

A recovery implementation must not skip an earlier authority layer because a later artifact appears internally valid.

## 7. Failure boundary

Recovery MUST fail closed when any of the following is established:

- manifest bytes/hash mismatch;
- referenced segment identity or digest mismatch;
- missing required authority artifact;
- checkpoint bytes/hash mismatch;
- checkpoint references an invalid or unverifiable manifest;
- checkpoint generation differs from manifest generation;
- cursor bytes/hash mismatch;
- cursor exceeds checkpoint authority;
- ambiguous or inconsistent authority state;
- any integrity conflict prevents determining one authoritative committed state.

A recovery implementation must not guess, repair silently, or choose an artifact by recency.

## 8. Crash/durability boundary

The reference model requires that recovery prove:

```text
cursor <= checkpoint authority
```

at all times after recovery.

The design therefore requires a durability ordering in which committed evidence and checkpoint authority precede any cursor state that claims progress beyond that checkpoint.

The exact write protocol, filesystem transaction mechanism, SQLite transaction boundary, and crash-injection implementation are **not frozen here**.

They must be specified and tested before production V4 recovery handling is authorized.

## 9. Transition interaction

Transition validation and checkpoint authority are separate integrity layers.

A valid transition chain establishes evidence-state authority for its contiguous sequence.

A checkpoint establishes a verified manifest commit.

Neither object may silently substitute for the other.

Required future linkage tests must therefore cover:

- valid transition chain + valid checkpoint;
- transition gap with otherwise valid checkpoint;
- checkpoint referencing invalid manifest;
- checkpoint generation mismatch;
- cursor beyond a valid checkpoint;
- valid cursor bounded by valid checkpoint;
- malformed checkpoint;
- malformed cursor;
- conflicting authority artifacts.

## 10. What remains unfrozen

Before executable checkpoint/cursor vectors are created, a normative contract must freeze at least:

### Checkpoint

- exact key set;
- field types;
- generation lexical/range rules;
- manifest hash representation;
- checkpoint hash preimage;
- checkpoint identity;
- nullability;
- duplicate/collision identity.

### Cursor

- exact key set;
- field types;
- progress coordinate;
- coordinate lexical/range rules;
- checkpoint binding;
- cursor hash preimage;
- cursor identity;
- nullability;
- duplicate/collision identity.

### Recovery

- exact authority comparison rules;
- stale-state disposition;
- missing-artifact disposition;
- ambiguity classification;
- crash commit ordering;
- atomicity boundaries;
- recovery result states.

These must be frozen from the reference model or through an explicitly reviewed normative contract before implementation.

## 11. Required future vector families

### Positive

- valid manifest;
- valid segment inventory;
- valid checkpoint bound to manifest;
- valid cursor within checkpoint authority;
- valid complete recovery chain.

### Negative

- manifest hash mutation;
- segment digest mutation;
- missing segment;
- checkpoint hash mutation;
- checkpoint manifest-hash mismatch;
- checkpoint generation mismatch;
- cursor hash mutation;
- cursor beyond checkpoint;
- malformed cursor;
- stale cursor;
- missing authority artifact;
- conflicting authority artifacts;
- ambiguous recovery state;
- crash before checkpoint commit;
- crash after checkpoint commit but before cursor update;
- cursor update attempting to outrun checkpoint.

## 12. Independence

Reference checkpoint/cursor/recovery work must remain independent of:

- production ingestion;
- legacy raw storage;
- production SQLite state;
- live RPC providers;
- production migration;
- deployment/runtime state.

Vectors and offline verification must operate from supplied deterministic artifacts only.

## 13. Gate 2

Design Gate 2 remains **OPEN**.

This audit establishes the current checkpoint/recovery boundary but does not claim checkpoint/cursor implementation completion.

## 14. Next

Freeze the normative V4 checkpoint contract and cursor contract separately before implementing executable checkpoint/cursor/recovery vectors.

