# STEP 579 — Runtime Canonical Lineage Integration Implementation Design Addendum v0.1

Status: IMPLEMENTATION ADDENDUM
Step: 579
Predecessor: STEP 578
Base commit: `67261beefe8a2ca11ae23d0fa77f68cbddaff409`
Gate 2: PASS
V4 production activation: INACTIVE

## 1. Purpose

This addendum records the repository-state adjustment required before production implementation.

STEP 574 proposed schema v5→v6 for runtime lineage. STEP 578 independently and validly consumed schema version 6 for canonical decision input persistence. Therefore STEP 579 SHALL preserve the frozen STEP 573 semantics while extending the current schema v6 additively to schema v7. This is not a semantic contract change: all STEP 573 lineage, transition, generation, identity, replay, and fail-closed rules remain unchanged.

## 2. Implementation boundary

Production implementation SHALL add:

- `src/core/runtime-canonical-lineage.js`;
- immutable `canonical_transitions` history;
- reconstructible `canonical_lineage` lookup state;
- deterministic transition identity/hash using the existing STEP 574 F-02 domain;
- deterministic processing-result and processing-execution identities;
- explicit INITIAL/CONTINUATION/REORG_REPLACEMENT generation handling;
- exact-range canonical membership derived from the verified STEP 576/578 canonical decision snapshot;
- fail-closed replay, conflict, writer-fence, and persistence behavior.

The implementation SHALL NOT:

- modify STEP 573 frozen semantics;
- modify STEP 563 commitment formulas;
- modify STEP 568 evidence-set digest semantics;
- call expected-authority or submitted-authority logic to decide canonicality/generation;
- mutate/reset the cursor;
- activate V4 production;
- erase or rewrite historical evidence;
- connect HAHAWEEK to another project.

## 3. Canonical membership rule

For an exact canonical-decision snapshot, a complete canonical evidence item whose raw event block hash equals the persisted canonical block hash for that block is eligible for `OBSERVED -> CANONICAL`. A complete evidence item whose block is in-range but whose block hash is not the accepted snapshot hash is eligible only for `OBSERVED -> ORPHANED` after the evidence integrity checks succeed.

Previously canonical evidence that is no longer on the accepted block branch receives an immutable `CANONICAL -> ORPHANED` transition. Historical transitions remain untouched.

No RPC log presence is used as canonicality authority.

## 4. Generation and identity inputs

INITIAL and REORG_REPLACEMENT require an explicitly supplied uint64 decimal generation. CONTINUATION resolves generation from its persisted accepted parent and does not increment it.

Processing-result identity and processing-execution identity are domain-separated SHA-256 commitments over canonical JCS payloads containing exact range, transition type, parent lineage, generation, and canonical evidence membership. They exclude wall-clock time and writer-fence values.

## 5. Persistence and recovery

The lineage implementation snapshots database state before mutation. If transition or processing-result persistence fails, the pre-operation state is restored. Existing immutable records are never updated or deleted.

A mutable lineage row is cross-verified against the immutable processing result and its ordered evidence membership on read/replay.

## 6. Schema boundary

Current main schema is v6 because STEP 578 already owns canonical decision input tables. STEP 579 therefore adds a transactional v6→v7 migration and creates v7 directly for fresh databases. All v5→v6 historical migrations remain unchanged and preserved.

## 7. Acceptance focus

Tests SHALL cover transition genesis, valid edges, invalid edges, predecessor/sequence integrity, idempotence/conflict, canonical/orphaned admission, INITIAL/CONTINUATION/REORG_REPLACEMENT, deterministic identities/golden vectors, empty result, exact range, writer-fence loss, persistence rollback, replay/recovery, schema migration, and preservation of existing STEP 578 tables/rows.
