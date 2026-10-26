# STEP 575 — Runtime Canonical Decision Input / Lineage Implementation Readiness Analysis v0.1

Status: BLOCKED / ANALYSIS FINDING
Step: 575
Predecessor: STEP 574
Starting commit: `ea6a8eff32b5c45d43e6ffed575db9c43ae7ff36`
Gate 2: PASS
V4 production activation: INACTIVE

## 1. Objective

Determine whether the repository already contains an authoritative canonical-decision input that satisfies STEP 573, or whether a new contract is required before runtime canonical-lineage implementation.

## 2. Actual repository inspection

The repository was inspected at the current main commit before any change.

Relevant runtime surfaces:

- `src/core/rpc.js`
- `src/core/raw-log-ingestion.js`
- `src/core/canonical-evidence.js`
- `src/core/evidence-repository.js`
- `src/v4/f02-reorg-verifier.js`
- `src/core/f03-generation-recovery.js`
- `src/core/processing-result-persistence.js`
- `src/core/ingestion.js`
- `src/index.js`
- STEP 571 contract
- STEP 572 analysis
- STEP 573 contract
- STEP 574 design/analysis

## 3. Finding: no approved runtime canonical-decision source

### 3.1 RPC provider

`src/core/rpc.js` exposes an ethers JSON-RPC provider and chain/block-number status.

`RawLogIngestion` uses RPC `getLogs` for acquisition.

This establishes acquisition capability, not canonical lineage authority.

STEP 573 explicitly prohibits treating RPC presence alone as canonical acceptance.

No repository-owned persisted block-header/canonical-branch relation was found in the inspected runtime schema.

### 3.2 Raw events

Raw events preserve:

- chain identity;
- block number;
- optional block hash;
- transaction hash;
- optional transaction index;
- log index;
- event payload.

Raw persistence is immutable evidence acquisition. It does not establish that a block belongs to the accepted canonical branch.

### 3.3 Canonical evidence

`createCanonicalEvidence` can create a complete evidence identity when block hash and transaction index are available.

`createEvidenceRepository` verifies raw/canonical hashes and immutable linkage.

Neither component selects the canonical branch.

Therefore canonical evidence is not itself a canonical-decision oracle.

### 3.4 F-02 verifier

`src/v4/f02-reorg-verifier.js` validates explicit transition histories and preserves:

- `OBSERVED`;
- `CANONICAL`;
- `ORPHANED`;
- `OBSERVED -> CANONICAL`;
- `CANONICAL -> ORPHANED`.

It is an offline deterministic verifier.

Promoting its fixture/history input into a production canonical oracle would invent a new runtime authority boundary.

### 3.5 F-03 generation recovery

`src/core/f03-generation-recovery.js` validates supplied generation/recovery conditions.

It does not determine canonical branch membership and cannot supply the missing canonical decision.

### 3.6 Processing-result persistence

STEP 568 persistence deliberately consumes already-established context.

It does not establish canonicality or generation.

Using it as the canonical decision source would invert the frozen ownership model.

### 3.7 Expected authority

The expected F-03 authority chain is explicitly independent verification output.

STEP 573 forbids the runtime canonical lineage owner from using expected authority to decide canonicality or generation.

Therefore it cannot fill this gap.

## 4. Readiness result

The repository does **not** currently contain an approved runtime canonical-decision input satisfying STEP 573.

The following possible shortcuts are rejected:

- RPC log presence;
- latest RPC block number;
- cursor state;
- writer-fence value;
- timestamps;
- expected authority;
- F-03 checkpoint/manifest digest;
- F-02 offline verifier output without a frozen runtime input contract;
- arbitrary block/hash derivation;
- default canonicality;
- default generation.

Each would either violate an existing frozen ownership boundary or manufacture authority not present in the repository.

## 5. Required canonical-decision contract

Before production lineage implementation, a dedicated contract is required to define the repository-approved canonical-decision input.

At minimum it must define:

1. **Decision subject**
   - exact inclusive block range;
   - block identity;
   - canonical branch/parent relationship;
   - evidence membership implications.

2. **Decision provenance**
   - authoritative source;
   - acquisition provenance;
   - source identity;
   - deterministic replay requirements.

3. **Canonical branch semantics**
   - how a block is accepted as canonical;
   - how a previously canonical block becomes orphaned;
   - how competing branches are represented;
   - ambiguity/fork handling.

4. **Persistence**
   - durable representation of the canonical decision input;
   - immutable historical preservation;
   - recovery/reconstruction;
   - migration boundary if schema changes.

5. **Reorg semantics**
   - exact replacement membership;
   - parent lineage;
   - orphan admission;
   - no historical mutation.

6. **Generation establishment**
   - initial generation source;
   - continuation semantics;
   - replacement generation semantics;
   - deterministic restart/replay behavior.

7. **Security/fail-closed**
   - incomplete block identity;
   - parent mismatch;
   - conflicting canonical decisions;
   - missing decision;
   - ambiguous branch;
   - stale writer ownership;
   - persistence failure.

8. **Test/golden vectors**
   - canonical decision identity;
   - branch/reorg examples;
   - replay;
   - conflict;
   - historical preservation;
   - restart recovery.

## 6. Important boundary

A canonical-decision input contract must not redefine or alter:

- STEP 563 evidence commitment formulas;
- STEP 568 processing-result schema/digest;
- STEP 573 transition states/edges;
- existing F-03 expected-authority semantics;
- cursor advancement semantics.

It supplies an upstream canonical-lineage fact; it does not replace those contracts.

## 7. No production implementation

STEP 575 intentionally makes no production implementation.

Implementing `runtime-canonical-lineage` before this missing input is contracted would force the implementation to choose a canonical branch source. That would violate the standing fail-closed/no-semantic-invention rule.

## 8. Acceptance disposition

- Repository state inspected before modification: PASS.
- STEP 573 consumed: PASS.
- Existing canonical-decision source satisfying STEP 573: NOT FOUND.
- RPC presence sufficient for canonicality: NO.
- Expected authority usable as canonicality input: NO.
- F-02 verifier usable as implicit runtime oracle: NO.
- Cursor usable as canonicality/generation source: NO.
- Safe runtime implementation at current contract boundary: FAIL.
- Production code changed: NO.
- Schema changed: NO.
- Cursor changed: NO.
- Historical evidence changed: NO.
- STEP 563 changed: NO.
- STEP 568 changed: NO.
- V4 production activation: INACTIVE.

## 9. Next step

**STEP 576 — Runtime Canonical Decision Input Contract.**

STEP 576 must freeze the exact canonical-decision input/source, provenance, branch/reorg semantics, persistence, recovery, generation establishment boundary, and golden vectors before runtime canonical-lineage production code is implemented.
