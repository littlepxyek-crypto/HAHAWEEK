# STEP 572 — Runtime Canonical Processing / Generation Lineage Implementation Analysis Finding v0.1

Status: BLOCKED / ANALYSIS FINDING
Step: 572
Predecessor: STEP 571
Starting commit: `bc7b2312387d53b00f3ad5fa0d32bac6c347a717`
Gate 2: PASS
V4 production activation: INACTIVE

## 1. Objective

Determine whether the repository can implement the STEP 571 runtime canonical-processing / generation-lineage boundary without inventing semantics, and identify the exact implementation/design boundary required for the next step.

## 2. Repository state inspected

The following runtime surfaces were inspected at the starting commit:

- `src/index.js`
- `src/core/ingestion.js`
- `src/core/raw-log-ingestion.js`
- `src/core/canonical-evidence.js`
- `src/core/evidence-repository.js`
- `src/core/processing-result-persistence.js`
- `src/v4/f02-reorg-verifier.js`
- `src/core/f03-generation-recovery.js`
- STEP 570 analysis
- STEP 571 boundary contract

The current runtime range processor in `src/index.js` only performs raw-log acquisition through `RawLogIngestion.ingestRange`, persists the database, and returns raw-ingestion counters. It does not construct canonical evidence, establish canonical acceptance, resolve reorg lineage, resolve generation, construct processing identities, or persist a STEP 568 processing-result context.

## 3. Findings

### 3.1 Raw ingestion is not canonical processing

`RawLogIngestion.ingestRange` acquires RPC logs and appends immutable raw events. Its output is acquisition counters:

- fromBlock
- toBlock
- fetched
- inserted
- duplicates

RPC inclusion is therefore not sufficient evidence of canonical acceptance.

### 3.2 Canonical evidence construction exists but is not an acceptance authority

`createCanonicalEvidence` deterministically projects a raw event and can establish a complete identity when block hash and transaction index are available. `createEvidenceRepository.insert` verifies raw linkage and cryptographic hashes and persists canonical evidence.

Neither surface decides whether evidence is currently canonical, orphaned, or replaced. Persisting canonical evidence is therefore not equivalent to establishing canonical lineage.

### 3.3 Existing F-02 verifier is not a runtime lineage owner

`src/v4/f02-reorg-verifier.js` validates explicit transition histories using the frozen states:

`OBSERVED -> CANONICAL`
`CANONICAL -> ORPHANED`

It is an offline validation boundary. It does not own runtime block canonicality, replacement selection, processing-result lineage, or generation establishment. Promoting it directly into runtime authority would exceed its existing contract.

### 3.4 No durable runtime transition-history owner was found

The inspected repository surfaces do not provide a production runtime persistence mechanism that records canonical evidence transitions as immutable transition evidence while preserving all historical records.

STEP 571 explicitly requires historical auditability for:

`OBSERVED -> CANONICAL -> ORPHANED`

and states that the exact persistent transition-history mechanism is implementation scope that must be frozen before code if repository semantics do not already provide it.

This mechanism is not present in the inspected runtime path. Therefore runtime reorg implementation cannot safely proceed by mutating `canonical_evidence` in place or by treating the latest RPC result as canonical.

### 3.5 Generation remains unowned at runtime

`src/core/f03-generation-recovery.js` validates supplied generation values and recovery conditions; it does not establish runtime generation lineage.

STEP 571 requires:

- INITIAL generation supplied by the canonical lineage owner;
- CONTINUATION generation equal to parent unless a separately established lineage transition exists;
- REORG_REPLACEMENT generation different from parent and explicitly established by the canonical reorg lineage decision.

No current runtime component establishes that lineage. The repository therefore has no safe source from which STEP 568 can receive generation.

The following are explicitly rejected:

- cursor;
- timestamp/wall clock;
- writer-fence value;
- expected authority;
- checkpoint/manifest digest;
- randomness;
- arbitrary hash truncation;
- default generation 0.

### 3.6 Processing identities remain unowned

STEP 568 requires distinct processing-result and processing-execution identities. STEP 571 requires deterministic replay and changed-outcome separation.

The current `src/index.js` processor does not construct either identity and does not expose a canonical processing context. STEP 568 correctly refuses to manufacture these values.

### 3.7 Ingestion ordering is not yet sufficient for STEP 571

`src/core/ingestion.js` currently executes:

1. processorRange;
2. authorityGate;
3. cursor.advance.

The processorRange implementation only performs raw ingestion and database save. It therefore does not satisfy the STEP 571 required ordering:

1. writer ownership;
2. exact raw ingestion;
3. canonical evidence construction/persistence;
4. canonical/reorg lineage decision;
5. generation resolution;
6. immutable processing context construction;
7. STEP 568 durable processing-result persistence;
8. independent submitted authority derivation;
9. expected-authority resolution and binding;
10. cursor advancement.

The cursor must not be advanced merely because raw ingestion succeeded.

## 4. Required implementation boundary

The next implementation must introduce a runtime canonical-processing owner with explicit sub-boundaries:

### A. Canonical evidence admission

Input:

- exact inclusive range;
- immutable raw events already persisted;
- current repository canonical-lineage state.

Output:

- deterministic, cryptographically verified canonical evidence membership;
- explicit empty membership when valid.

Rules:

- no RPC-only admission;
- complete identity required;
- raw linkage required;
- exact range required;
- conflicting hashes fail closed;
- no silent omission/replacement.

### B. Immutable transition history

The implementation needs a durable, append-only transition representation for canonical evidence lineage.

Minimum semantics:

- preserve immutable evidence;
- represent `OBSERVED -> CANONICAL`;
- represent `CANONICAL -> ORPHANED`;
- preserve predecessor linkage/integrity;
- support deterministic replay/recovery;
- never rewrite/delete prior transition evidence.

The exact schema, identity, ordering, digest, idempotence/conflict behavior, and recovery semantics must be frozen by a contract before production code if they are not already specified elsewhere.

### C. Canonical/reorg lineage decision

The runtime owner must determine:

- whether the exact range is canonically accepted;
- whether a prior accepted result is replaced;
- exact replacement evidence membership;
- parent processing-result lineage;
- transition type.

Ambiguous canonicality must fail closed.

### D. Generation lineage

The runtime owner must resolve generation from persisted canonical lineage.

It must not manufacture generation from unrelated values.

The implementation contract must define how initial generation is established and how continuation/reorg transitions resolve it while remaining deterministic across restart and replay.

### E. Processing identity derivation

The implementation contract must define deterministic derivation/assignment of:

- processingResultId;
- processingExecutionId.

Replay must be distinguishable from changed canonical outcomes without allowing identity collisions or reuse of an invalidated result.

### F. Processing-result persistence integration

Once A-E are complete, the existing STEP 568 persistence adapter can consume the resulting immutable context. STEP 568 schema/digest semantics remain unchanged.

### G. Authority/cursor ordering

The canonical processor must complete and durably persist the accepted processing context before submitted authority derivation and before cursor advancement.

Expected authority remains an independent verification source.

## 5. Design decision

No production runtime code is changed in STEP 572.

Implementing the missing runtime owner immediately would require inventing at least:

- transition-history persistence semantics;
- canonical replacement selection semantics;
- initial/reorg generation establishment;
- processing identity derivation.

Those semantics are not currently frozen by the repository contracts.

Changing production code now would violate STEP 571's fail-closed and no-semantic-invention requirements.

## 6. Acceptance disposition

- Repository state inspected: PASS.
- STEP 571 contract consumed: PASS.
- Raw ingestion boundary identified: PASS.
- Canonical evidence construction/persistence boundary identified: PASS.
- Runtime canonical acceptance owner: MISSING.
- Durable immutable transition-history owner: MISSING.
- Runtime reorg/replacement decision owner: MISSING.
- Runtime generation lineage owner: MISSING.
- Processing identity derivation owner: MISSING.
- Safe production implementation without semantic invention: FAIL.
- Production code changed: NO.
- Cursor changed: NO.
- Historical evidence changed/deleted: NO.
- STEP 563 semantics changed: NO.
- STEP 568 schema/digest semantics changed: NO.
- V4 production activation: INACTIVE.

## 7. Required next step

The next safe step is:

**STEP 573 — Runtime Canonical Lineage / Transition-History Implementation Contract.**

STEP 573 must freeze the missing durable transition-history, canonical/reorg lineage decision, generation establishment, and deterministic processing identity semantics before implementation.

