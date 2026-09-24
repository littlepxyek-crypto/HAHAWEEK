# STEP 571 — Runtime Canonical Processing / Generation Lineage Boundary Contract v0.1

Status: CONTRACT
Step: 571
Predecessor: STEP 570
Gate 2: PASS
V4 production activation: INACTIVE

## 1. Purpose

Freeze the missing authoritative runtime boundary required before STEP 570 can safely implement runtime processing-result context integration.

This contract defines how HAHAWEEK determines canonical processing acceptance, reorg/replacement lineage, and generation authority from repository-owned runtime evidence.

It does not activate V4 production authority and does not itself implement the runtime boundary.

## 2. Repository-observed baseline

At the STEP 571 starting commit `1cc3bac9515929d68dc4011ce80c35b78b6d4ce4`:

- raw runtime ingestion persists immutable raw events;
- canonical evidence construction exists but is not wired into the production range processor;
- canonical evidence persistence exists but is not the authoritative runtime acceptance boundary;
- STEP 568 durable processing-result persistence requires caller-supplied canonical processing context;
- F-02 reorg verification exists as deterministic/offline validation and must not be promoted implicitly to runtime authority;
- F-03 generation validation/recovery utilities validate supplied generation but do not establish runtime lineage;
- no production runtime component currently owns canonical acceptance + reorg replacement + generation transition semantics.

Therefore the missing authority must be explicitly frozen before implementation.

## 3. Runtime canonical-processing boundary

The runtime canonical processor MUST be the sole producer of an accepted processing lineage context.

For each exact inclusive range `[fromBlock,toBlock]`, it MUST produce either:

1. an accepted canonical processing context; or
2. a fail-closed outcome explaining why no accepted context exists.

It MUST NOT return an authority-eligible context when canonicality is unknown, ambiguous, or contradicted by repository evidence.

The boundary owns:

- exact processed range;
- canonical block/evidence determination;
- accepted canonical evidence membership;
- canonical/reorg decision;
- lineage transition type;
- generation supplied to STEP 568;
- processing-result identity;
- processing-execution identity;
- deterministic provenance.

## 4. Canonical evidence admission

Only evidence with a complete cryptographic identity and valid immutable raw-event linkage may enter an accepted canonical processing result.

For every admitted evidence item:

- its raw event MUST already be durably present;
- canonical evidence MUST be deterministically derived from that raw event;
- evidence identity/hash linkage MUST verify;
- block and transaction location MUST be complete enough for deterministic ordering;
- the evidence MUST belong to the exact processing range;
- the runtime canonical decision MUST mark it accepted rather than orphaned/replaced.

No evidence may be admitted solely because it was returned by an RPC query.

No silent normalization, replacement, deletion, or omission is permitted.

## 5. Canonicality model

The runtime boundary MUST preserve the existing F-02 transition semantics:

- `OBSERVED -> CANONICAL`
- `CANONICAL -> ORPHANED`

No additional state or transition edge is introduced by STEP 571.

Canonical/orphaned historical records MUST coexist. Orphaning MUST never delete or mutate the prior evidence record.

An accepted processing result may reference only evidence whose current canonical lineage is valid at commitment time.

If canonicality cannot be established deterministically, the result MUST fail closed rather than default to canonical.

## 6. Reorg/replacement semantics

A detected canonical replacement MUST create a new processing-result lineage context.

The prior accepted result remains immutable historical evidence.

A replacement context MUST:

- use `transitionType = REORG_REPLACEMENT`;
- reference `parentResultId`;
- receive an explicitly established new generation;
- contain the exact replacement canonical evidence membership;
- exclude evidence invalidated by the reorg;
- be persisted as a new immutable processing result through STEP 568.

The runtime canonical processor MUST NOT mutate or delete the parent processing result.

A reorg MUST NOT be represented by changing generation alone without a corresponding canonical processing/replacement decision.

## 7. Generation authority

Generation is a canonical-processing lineage value.

For `INITIAL`:

- generation MUST be explicitly supplied by the canonical lineage owner;
- it MUST be valid under the existing F-03 uint64 decimal representation.

For `CONTINUATION`:

- parent lineage MUST exist;
- generation MUST equal the parent generation unless a separate canonical lineage transition is explicitly established under a future contract;
- STEP 571 does not authorize implicit generation increments.

For `REORG_REPLACEMENT`:

- parent lineage MUST exist;
- generation MUST differ from the parent;
- the new generation MUST be established by the canonical reorg lineage decision before STEP 568 persistence.

Generation MUST NOT be derived from:

- cursor;
- wall-clock time;
- timestamps;
- writer-fence value;
- randomness;
- expected authority;
- checkpoint digest;
- manifest digest;
- arbitrary hash truncation;
- default `0`.

STEP 571 does not permit the runtime persistence adapter or submitted authority producer to choose generation.

## 8. Runtime lineage identity

The runtime MUST distinguish:

- processing execution identity — one concrete execution attempt;
- processing result identity — one immutable accepted canonical result.

Identical deterministic replay of the same accepted canonical execution MUST resolve to the same processing result identity and execution identity according to the implementation contract.

A changed canonical outcome MUST NOT reuse an old accepted result identity.

The identity derivation mechanism itself is implementation scope for the next implementation contract and MUST be deterministic and auditable.

## 9. Canonical processing output

The runtime canonical boundary MUST expose a context sufficient for STEP 568:

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

The values are authoritative outputs of canonical processing, not persistence-layer defaults.

`emptyResult` MUST be true exactly when the accepted canonical evidence membership is empty.

Missing canonical membership is not equivalent to an empty result.

## 10. Canonical evidence and reorg history

The runtime implementation MUST preserve historical evidence required to explain a reorg.

At minimum, an evidence subject that transitions through:

`OBSERVED -> CANONICAL -> ORPHANED`

must remain auditable through its preserved transition/evidence history.

The implementation MUST NOT rewrite an old canonical record into an orphaned record in place if that would destroy historical state. The transition must be represented by preserved transition evidence.

The exact persistent transition-history mechanism is implementation scope and must be frozen before code if repository semantics do not already provide it.

## 11. Deterministic execution and replay

For an unchanged canonical repository state and identical exact range:

- canonical evidence membership MUST be deterministic;
- transition lineage MUST be deterministic;
- generation MUST be resolved from the same persisted lineage;
- processing identities MUST resolve deterministically;
- provenance MUST be reproducible;
- the resulting processing context MUST be byte-equivalent.

A restart MUST read/derive from persisted canonical lineage rather than manufacture a new generation.

A reorg MUST produce a new deterministic replacement context.

## 12. Writer and concurrency boundary

The canonical-processing boundary MUST execute under the existing single-writer fence.

The writer fence MUST be verified before canonical acceptance and again before durable processing-result persistence.

Loss of ownership MUST fail closed.

Two concurrent writers MUST NOT create conflicting canonical results for the same lineage boundary.

The runtime implementation MUST NOT use the writer-fence token itself as semantic generation.

## 13. Ordering with STEP 568 and ingestion cursor

The authoritative ordering is:

1. writer ownership;
2. exact raw ingestion;
3. canonical evidence construction/persistence;
4. canonical/reorg lineage decision;
5. generation resolution;
6. immutable processing context construction;
7. STEP 568 durable processing-result persistence;
8. independent submitted authority derivation;
9. expected-authority resolution and cryptographic binding;
10. cursor advancement.

The cursor MUST NOT advance merely because raw ingestion succeeded.

STEP 568 persistence MUST NOT advance the cursor.

## 14. Independence from expected authority

The runtime canonical lineage owner MUST NOT call or depend on:

- `readF03AuthorityChain`;
- `createDurableExpectedAuthorityFactory`;
- submitted authority output;
- cursor state as a source of generation.

Expected authority remains an independent verification source.

The future submitted authority producer consumes the persisted canonical processing result; it does not establish canonicality or generation.

## 15. Fail-closed conditions

The runtime canonical boundary MUST reject authority-eligible acceptance on:

- missing block/canonicality evidence;
- incomplete evidence identity;
- missing raw-event linkage;
- conflicting evidence hashes;
- ambiguous canonical branch;
- orphaned/reorg-invalid evidence;
- missing parent lineage;
- invalid generation;
- invalid generation transition;
- duplicate/conflicting processing identity;
- lost writer ownership;
- non-deterministic lineage resolution;
- persistence failure.

No fallback to expected authority, cursor, timestamp, checkpoint, manifest, or default generation is allowed.

## 16. Scope exclusions

STEP 571 does not:

- modify STEP 563 commitment formulas;
- modify STEP 568 persistence schema/digest semantics;
- implement submitted authority;
- activate V4 production;
- reset cursor;
- delete/rewrite historical evidence;
- introduce prediction/ranking/trading/publication behavior;
- connect HAHAWEEK to another project.

## 17. Acceptance criteria

1. Runtime canonical processing is explicitly established as the owner of canonical acceptance and lineage context.
2. Existing F-02 transition semantics are preserved without adding states or edges.
3. Reorg replacement creates a new immutable processing-result lineage.
4. Generation authority and forbidden derivations are frozen.
5. Processing execution/result identities are distinguished.
6. Exact canonical evidence admission and empty-result semantics are frozen.
7. Writer-fence and cursor ordering are frozen.
8. Independence from expected authority is explicit.
9. Replay/recovery and fail-closed conditions are explicit.
10. STEP 563 and STEP 568 semantics remain unchanged.
11. No V4 production activation occurs.
12. The next implementation step is identified: STEP 572 — Runtime Canonical Processing / Generation Lineage Implementation Analysis.

## 18. Traceability

Requirement → STEP 571 contract → STEP 572 implementation analysis → design → code → tests → Security/Regression → CI → review → merge → post-merge verification → reconciliation → documentation → subsequent runtime integration.
