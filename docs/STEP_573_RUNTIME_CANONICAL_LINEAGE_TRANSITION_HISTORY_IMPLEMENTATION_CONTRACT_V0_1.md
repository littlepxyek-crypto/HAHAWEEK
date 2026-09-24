# STEP 573 — Runtime Canonical Lineage / Transition-History Implementation Contract v0.1

Status: CONTRACT
Step: 573
Predecessor: STEP 572
Gate 2: PASS
V4 production activation: INACTIVE

## 1. Purpose

Freeze the missing durable runtime canonical-lineage semantics identified by STEP 572 before production implementation.

This contract defines:

- immutable canonical evidence transition history;
- runtime canonical/reorg lineage decision ownership;
- deterministic generation establishment;
- deterministic processing-result / processing-execution identity semantics;
- replay, idempotence, conflict, recovery, writer-fence, and fail-closed behavior.

This contract does not implement production code, change STEP 563 formulas, change STEP 568 persistence semantics, activate V4, or advance/reset the cursor.

## 2. Repository-observed baseline

At STEP 572 the repository contains:

- immutable raw-event storage;
- canonical evidence construction and persistence;
- F-02 offline transition validation for `OBSERVED -> CANONICAL -> ORPHANED`;
- STEP 568 immutable processing-result persistence;
- single-writer fencing.

It does not contain a durable runtime owner for canonical transition history, canonical/reorg decision, generation establishment, or processing identity derivation.

STEP 573 therefore establishes the missing semantic contract without modifying those existing boundaries.

## 3. Ownership

### 3.1 Runtime canonical lineage owner

A new runtime canonical lineage component SHALL be the sole authority for accepted canonical lineage context.

It SHALL consume repository-owned raw/canonical evidence and produce either:

1. an accepted immutable lineage context; or
2. a fail-closed error.

It SHALL NOT consume expected-authority output as an input to decide canonicality or generation.

It SHALL NOT use cursor state, writer-fence value, timestamps, checkpoint/manifest digests, randomness, or hash truncation as generation authority.

### 3.2 Persistence ownership

The lineage owner is responsible for durable transition-history state.

STEP 568 remains responsible only for durable processing-result/evidence-membership persistence once a valid context has been established.

The lineage owner MUST NOT alter the STEP 568 schema or evidence-set digest formula.

## 4. Canonical evidence transition history

A new append-only transition-history relation SHALL preserve every canonicality transition without mutating prior transition records.

Each transition record SHALL contain exactly the following semantic fields:

- `transition_id`
- `evidence_id`
- `from_state`
- `to_state`
- `sequence`
- `previous_transition_hash`
- `transition_hash`
- `provenance_json`
- `committed_at`

Allowed states:

- `OBSERVED`
- `CANONICAL`
- `ORPHANED`

Allowed edges remain exactly:

- `OBSERVED -> CANONICAL`
- `CANONICAL -> ORPHANED`

No other edge or state is introduced.

### 4.1 Transition identity

`transition_id` SHALL be deterministic and immutable.

The implementation SHALL use a domain-separated SHA-256 commitment over canonical JCS of the transition identity payload.

The exact digest domain and identity payload field order SHALL be frozen by the implementation tests/golden vectors before implementation is considered complete.

No UUID/random value SHALL be used as semantic transition identity.

### 4.2 Sequence and predecessor

Sequence is an unsigned decimal integer represented as a string.

The first transition for an evidence subject SHALL use sequence `0` and `previous_transition_hash = null`.

Every subsequent transition for the same evidence subject SHALL reference the immediately preceding transition hash and increment sequence by exactly one.

A missing predecessor, sequence gap, duplicate sequence with a different hash, or conflicting transition identity SHALL fail closed.

### 4.3 Historical preservation

Transition records are append-only.

The implementation MUST NOT:

- update an existing transition;
- delete an existing transition;
- rewrite canonical evidence to erase a prior state;
- silently replace a conflicting transition.

The historical chain MUST remain auditable after reorg.

## 5. Transition admission

### 5.1 OBSERVED

An evidence subject may enter `OBSERVED` only when:

- immutable raw event linkage exists;
- canonical evidence identity is complete;
- raw/canonical hashes verify;
- evidence belongs to the relevant exact range.

`OBSERVED` records the runtime observation; it does not mean canonical acceptance.

### 5.2 OBSERVED -> CANONICAL

The transition is admitted only when runtime canonicality is deterministically established.

The canonical decision MUST be based on repository-owned canonical lineage evidence.

RPC presence alone is insufficient.

The resulting evidence becomes eligible for an accepted processing-result membership only after this transition is durably committed.

### 5.3 CANONICAL -> ORPHANED

The transition is admitted only when the runtime canonical lineage owner deterministically establishes that the previously canonical evidence is no longer part of the accepted canonical branch.

The previous canonical evidence and transition history remain unchanged.

The orphaned evidence MUST be excluded from every subsequently accepted replacement processing-result membership.

### 5.4 Invalid transitions

The implementation MUST fail closed on:

- unknown state;
- unsupported edge;
- missing predecessor;
- sequence gap;
- conflicting identity/hash;
- incomplete evidence identity;
- missing raw linkage;
- hash mismatch;
- nondeterministic canonical decision;
- attempted historical mutation.

## 6. Runtime canonical processing context

For each exact inclusive range `[fromBlock,toBlock]`, the lineage owner SHALL establish:

```
{
  processingResultId,
  processingExecutionId,
  parentResultId,
  transitionType,
  fromBlock,
  toBlock,
  generation,
  status: "ACCEPTED",
  canonicalityStatus: "CANONICAL",
  canonicalEvidenceIds,
  emptyResult,
  provenance,
  committedAt
}
```

These values are authoritative runtime outputs.

Missing evidence membership SHALL NOT be interpreted as an empty result.

`emptyResult` SHALL equal:

```
canonicalEvidenceIds.length === 0
```

## 7. Processing-result lineage

### 7.1 INITIAL

INITIAL SHALL be permitted only when no prior accepted processing lineage exists for the applicable canonical lineage.

Requirements:

- `parentResultId = null`;
- generation is explicitly established by the canonical lineage owner;
- generation is valid uint64 decimal;
- exact range is committed;
- canonical evidence membership is explicit.

INITIAL generation SHALL NOT be inferred from cursor, authority, timestamp, or any unrelated artifact.

### 7.2 CONTINUATION

CONTINUATION SHALL require an existing accepted parent processing result.

Requirements:

- `parentResultId` references the accepted parent;
- generation equals the parent generation;
- canonical evidence membership is determined from the current canonical lineage;
- no implicit generation increment occurs.

A continuation with a missing parent or generation mismatch SHALL fail closed.

### 7.3 REORG_REPLACEMENT

REORG_REPLACEMENT SHALL require:

- an existing accepted parent;
- a deterministic canonical replacement decision;
- exact replacement canonical evidence membership;
- `parentResultId`;
- a new generation different from the parent;
- immutable new processing-result identity.

The old result remains historical and is never mutated/deleted.

A generation change without a canonical replacement decision is invalid.

## 8. Generation establishment

Generation is a semantic lineage value.

The canonical lineage owner SHALL persist enough lineage state to resolve generation deterministically after restart.

The following are prohibited generation sources:

- cursor;
- wall clock;
- `committedAt`;
- writer-fence number;
- expected authority;
- checkpoint digest;
- manifest digest;
- random UUID;
- arbitrary hash truncation;
- default `0`.

### 8.1 Generation transition rules

- INITIAL: explicitly established initial lineage generation.
- CONTINUATION: same generation as parent.
- REORG_REPLACEMENT: explicitly established generation different from parent.

STEP 573 does not authorize an automatic numeric increment rule for reorg generation. The implementation MUST persist and read the established replacement generation rather than manufacture it during replay.

## 9. Processing identity

Processing execution identity and processing result identity are distinct.

### 9.1 Processing-result identity

`processingResultId` SHALL be a deterministic identity of the accepted canonical result context.

Its semantic input MUST include at minimum:

- exact range;
- transition type;
- parent lineage where applicable;
- generation;
- canonical evidence membership.

It MUST NOT include wall-clock time or writer-fence values.

A changed canonical outcome MUST produce a different processing-result identity.

### 9.2 Processing-execution identity

`processingExecutionId` SHALL identify the concrete deterministic processing execution represented by the accepted context.

For an unchanged canonical replay of the same persisted lineage state and exact range, the same execution identity SHALL be recoverable rather than replaced by a random value.

The implementation MUST define the exact deterministic identity formulas and golden vectors before production code is merged.

### 9.3 Collision/conflict behavior

Identity collision with different semantic content SHALL fail closed.

An existing identity with byte-equivalent semantic content SHALL be treated as idempotent replay.

An existing identity with different content SHALL be an integrity conflict.

## 10. Durable lineage state

The implementation SHALL introduce a durable canonical-lineage state sufficient to answer, without inference from cursor:

- latest accepted processing result for a lineage boundary;
- parent result;
- generation;
- transition type;
- canonical evidence membership;
- latest transition hash per evidence subject.

The state SHALL be append-only where historical facts are represented.

Any mutable index used for lookup SHALL be reconstructible from immutable records and verified against them.

No mutable index may become the sole historical source of truth.

## 11. Exact-range semantics

All canonical processing is for an exact inclusive range `[fromBlock,toBlock]`.

The implementation MUST fail closed if:

- fromBlock > toBlock;
- an evidence item lies outside the range;
- a required block identity is incomplete;
- canonical membership cannot be determined for the range;
- replacement membership is incomplete.

Empty canonical membership is valid only when the lineage owner explicitly commits an accepted empty result.

## 12. Replay and recovery

On restart:

1. acquire/verify writer ownership;
2. read immutable lineage history;
3. reconstruct/verify current canonical lineage;
4. resolve the same generation;
5. reconstruct the same processing identities;
6. verify or idempotently recover the existing processing result.

Recovery MUST NOT manufacture a new generation or processing identity merely because execution restarted.

Any integrity conflict MUST fail closed.

## 13. Writer and concurrency

The runtime lineage owner MUST execute under the existing writer fence.

Ownership MUST be asserted:

1. before canonical acceptance;
2. before transition-history durability;
3. before STEP 568 processing-result persistence.

Two concurrent writers MUST NOT commit conflicting lineage facts.

Writer-fence identity/value is operational concurrency metadata only and SHALL NOT enter semantic generation or processing identity.

## 14. Persistence ordering

The required order is:

1. writer ownership;
2. exact raw ingestion;
3. canonical evidence construction/persistence;
4. transition-history admission;
5. canonical/reorg lineage decision;
6. generation resolution;
7. processing identity derivation;
8. immutable processing context construction;
9. STEP 568 durable processing-result persistence;
10. independent submitted authority derivation;
11. expected-authority resolution and cryptographic binding;
12. cursor advancement.

A cursor MUST NOT advance before STEP 568 persistence and authority binding succeed.

## 15. Expected-authority independence

The canonical lineage owner MUST NOT call:

- `readF03AuthorityChain`;
- `createDurableExpectedAuthorityFactory`;
- submitted authority output.

Expected authority remains an independent verification source.

The submitted authority producer consumes the already persisted canonical processing context.

## 16. Fail-closed requirements

The implementation MUST reject authority-eligible acceptance on:

- incomplete evidence identity;
- missing raw linkage;
- hash conflict;
- ambiguous canonicality;
- unsupported transition;
- missing parent;
- generation conflict;
- missing persisted generation lineage;
- identity conflict;
- duplicate/conflicting transition;
- lost writer ownership;
- persistence failure;
- nondeterministic replay;
- incomplete replacement membership;
- attempted historical mutation.

No fallback behavior is permitted.

## 17. Schema and migration boundary

The implementation MAY require an additive schema migration from schema v5.

If a schema migration is required, it SHALL:

- preserve all existing tables and rows;
- be additive;
- be transactionally applied;
- fail closed on partial migration;
- include exact schema assertions;
- include fresh-database and v5 migration tests;
- never rewrite/delete historical raw/canonical/F-03/processing-result data.

STEP 573 itself does not perform the migration.

## 18. Test and golden-vector requirements

Before production implementation is considered complete, tests SHALL cover at minimum:

1. OBSERVED genesis;
2. OBSERVED -> CANONICAL;
3. CANONICAL -> ORPHANED;
4. invalid transition rejection;
5. predecessor/sequence integrity;
6. transition hash integrity;
7. duplicate idempotence;
8. conflicting duplicate rejection;
9. INITIAL lineage;
10. CONTINUATION same-generation lineage;
11. REORG_REPLACEMENT new-generation lineage;
12. changed canonical membership creates new result identity;
13. replay preserves identities;
14. empty-result semantics;
15. exact-range rejection;
16. raw/canonical hash conflict;
17. missing parent rejection;
18. writer-fence loss;
19. persistence failure recovery;
20. concurrent conflicting lineage;
21. v5 additive migration;
22. historical evidence preservation.

Deterministic golden vectors SHALL be added for transition identity/hash, generation lineage, processing-result identity, and processing-execution identity.

## 19. Scope exclusions

STEP 573 does not:

- implement production code;
- modify STEP 563 commitment formulas;
- modify STEP 568 evidence-set digest semantics;
- implement submitted authority;
- change expected-authority source;
- advance/reset cursor;
- activate V4 production;
- delete/rewrite historical evidence;
- introduce prediction, ranking, trading, or publication behavior;
- connect HAHAWEEK to another project.

## 20. Acceptance criteria

STEP 573 is accepted only when this contract freezes:

1. immutable transition-history ownership;
2. exact F-02 state/edge preservation;
3. transition identity and predecessor semantics;
4. canonical evidence admission requirements;
5. canonical/reorg lineage ownership;
6. INITIAL/CONTINUATION/REORG_REPLACEMENT semantics;
7. generation authority and forbidden derivations;
8. processing-result identity semantics;
9. processing-execution identity semantics;
10. durable lineage state requirements;
11. replay/recovery behavior;
12. writer/concurrency requirements;
13. exact ordering with STEP 568, authority, and cursor;
14. expected-authority independence;
15. fail-closed conditions;
16. additive migration boundary;
17. required tests and golden vectors;
18. preservation of STEP 563, STEP 568, historical evidence, and V4 inactive status.

## 21. Next step

**STEP 574 — Runtime Canonical Lineage / Transition-History Implementation Design & Analysis.**

STEP 574 SHALL inspect the repository against this frozen contract and determine the smallest safe implementation boundary before production code is written.
