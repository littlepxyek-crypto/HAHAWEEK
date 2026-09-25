# STEP 599 — V4 Production Authority Source Lifecycle Analysis v0.1

- Status: ANALYSIS
- Step: 599 Analysis
- Baseline: `be5e0b2a3ea61e15e0cc1f998e96ab2270dd9fe1`
- Predecessor: STEP 599 — V4 Production Authority Source Lifecycle Contract
- Gate 2: PASS
- V4 production authority: INACTIVE / BLOCKED

## 1. Objective

Determine from the actual repository whether a concrete production authority source can now be established under the frozen STEP 599 lifecycle contract without inventing semantics or changing existing authority, lineage, writer, cursor, evidence, or integrity ownership.

## 2. Repository inspection

The analysis inspected the exact baseline repository artifacts:

- `src/index.js`
- `src/core/f03-production-authority-record.js`
- `src/core/f03-authority-binding.js`
- `src/core/f03-authoritative-chain-persistence.js`
- `src/core/f03-ingestion-authority-integration.js`
- `src/core/runtime-processing-context.js`
- `src/core/ingestion.js`
- `src/core/database.js`
- `docs/STEP_599_V4_PRODUCTION_AUTHORITY_SOURCE_LIFECYCLE_CONTRACT_V0_1.md`
- `PROJECT_STATE.md`

The repository is the source of truth for this analysis.

## 3. Existing production-boundary components

### 3.1 Runtime requires an explicit production authority source

`src/index.js` constructs the production authority factory as the supplied `authorityFactory`, otherwise a fail-closed function that throws:

`AUTHORITY_SOURCE_REQUIRED`

Therefore the runtime does not select, derive, or default a production authority source.

### 3.2 Expected authority is durable and distinct

`createDurableExpectedAuthorityFactory(database)` reads the persisted F-03 segment/manifest/checkpoint chain through `readF03AuthorityChain()`.

The persisted chain verifies:

- exact requested range;
- one and only one segment for the exact range;
- segment → manifest linkage;
- manifest → checkpoint linkage;
- generation equality;
- digest validity;
- checkpoint digest derivation;
- persisted provenance.

This is a durable expected-authority commitment. It is not, by itself, a production authority source.

### 3.3 Existing production authority representation is insufficient to establish lifecycle identity by itself

`assertProductionAuthority()` validates:

- `segmentId`;
- `manifestDigest`;
- `checkpointDigest`;
- `generation`;
- `cursorBlock`.

The existing authority binding requires a valid `bindingDigest` and proves equality of the authority commitment to the expected commitment using the existing domain-separated SHA-256 formula.

These functions validate and bind an authority record; they do not establish who/what creates the production record, its lifecycle state, durable establishment event, or deterministic reconstruction source.

### 3.4 Existing durable F-03 persistence is not a production-authority lifecycle store

`commitF03AuthorityChain()` durably establishes the segment, manifest, and checkpoint chain in SQLite with writer-fence ownership, transaction handling, idempotent classification, integrity-conflict detection, linked-row verification, and durable save.

However, its returned object is the F-03 expected chain commitment:

- status `COMMITTED` or `IDEMPOTENT`;
- segment identity;
- manifest identity;
- checkpoint digest;
- generation;
- cursor endpoint.

It does not persist the production authority `bindingDigest` or an explicit production-authority lifecycle state/identity.

The current schema contains `f03_segments`, `f03_manifests`, and `f03_checkpoints`, but no contract-authorized production-authority lifecycle record/table was identified.

### 3.5 Existing authority gate preserves the distinction

`createAuthorityGate()` requires separate `authorityFactory` and `expectedAuthorityFactory` functions and rejects self-reference.

It verifies:

1. writer ownership where configured;
2. checkpoint commitment;
3. VERIFIED processing context;
4. exact range;
5. authority and expected-authority objects;
6. production-authority validation;
7. cryptographic authority binding;
8. generation equality with processing context;
9. cursor endpoint equality with processing context;
10. writer ownership again.

The gate is therefore a validation/authorization barrier, not the missing source-establishment mechanism.

### 3.6 Cursor ordering remains safe

`src/core/ingestion.js` calls the processing range first, then the authority gate, and only after the gate returns calls unchanged `BlockCursor.advance(toBlock)`.

No production authority implementation may bypass this ordering.

## 4. Lifecycle contract versus repository capability

The STEP 599 lifecycle contract requires a production authority source to establish and durably represent at least:

- explicit source identity/ownership;
- lifecycle state;
- provenance to the VERIFIED processing context;
- exact range/generation/cursor binding;
- expected-authority binding;
- valid `bindingDigest`;
- durable establishment boundary;
- deterministic recovery/reuse;
- reorg/replacement relationship without overwriting history;
- operator-visible verification.

The inspected repository provides validation and durable expected-authority primitives, but does not provide an explicit, contract-authorized production-authority establishment source that supplies these lifecycle semantics.

## 5. Critical missing boundary

The smallest missing seam remains:

`VERIFIED processing context`
→ **explicit production authority source and lifecycle record**
→ existing expected-authority binding
→ existing F-03 authority gate
→ unchanged `BlockCursor.advance()`

The missing source cannot safely be synthesized from:

- expected authority itself;
- checkpoint/manifest/segment persistence alone;
- cursor position;
- writer-fence state;
- timestamps;
- randomness;
- default values;
- Surveillance-derived outputs.

Doing so would invent authority ownership/lifecycle semantics or collapse the required distinction between expected and production authority.

## 6. Recovery and reorg finding

The existing F-03 persistence is idempotent for its own segment/manifest/checkpoint records and detects integrity conflicts. This does not establish deterministic recovery semantics for a separate production authority lifecycle record.

Canonical reorganization and generation are already owned by canonical processing lineage. A production authority lifecycle implementation may consume that generation, but the current repository does not define the immutable predecessor/replacement identity and durable lifecycle transition needed by STEP 599 without a further contract boundary.

Therefore reorg/replacement implementation remains blocked.

## 7. Operator Acceptance

Repository-grounded operator commands already documented by prior steps remain the only source of truth. No new production-authority command/procedure is invented by this analysis.

At present an operator cannot truthfully be given a repository-grounded procedure for:

- selecting a production authority source;
- establishing its lifecycle record;
- verifying durable establishment of that source;
- reconstructing that source after crash;
- handling a replacement authority after canonical reorganization.

Inventing such a procedure would violate the contract.

## 8. Surveillance boundary

Surveillance remains strictly derived, evidence-linked, versioned, reproducible, and non-authoritative.

It cannot supply the missing authority source, lifecycle identity, cursor authority, or production decision.

No Surveillance implementation or semantic change is authorized by this analysis.

**ADDRESS != ACTOR.**

## 9. STOP / FAIL-CLOSED assessment

Production authority must remain blocked when the source identity/ownership and durable lifecycle semantics are absent.

The following existing fail-closed boundaries remain correct:

- missing authority source;
- missing/ambiguous expected chain;
- missing/non-VERIFIED processing context;
- exact-range mismatch;
- generation mismatch;
- cursor endpoint mismatch;
- invalid authority binding;
- writer ownership failure;
- ambiguous reorg/replacement;
- non-deterministic recovery.

No fallback/default authority is justified.

## 10. Decision

**BLOCKED FOR PRODUCTION AUTHORITY IMPLEMENTATION.**

The current repository does not contain a sufficiently explicit, contract-authorized production authority source/lifecycle owner that can be implemented without inventing semantics.

No Design, Code, Test, Security/Regression, or V4 activation is authorized from this analysis.

## 11. Required next boundary

The next required step is a new explicit contract for the remaining production-authority establishment boundary, unless repository evidence discovered later identifies an already-owned lifecycle source.

The next contract must define, at minimum:

- source identity and ownership;
- lifecycle record identity;
- lifecycle persistence location/schema;
- bindingDigest establishment and persistence;
- relation to the existing F-03 expected-authority chain;
- VERIFIED processing-context provenance;
- durable establishment transaction/atomicity;
- idempotent reconstruction;
- reorg/replacement predecessor semantics;
- stale-authority rejection;
- operator-visible verification;
- writer-fence ownership;
- STOP/FAIL-CLOSED behavior;
- Surveillance non-authority.

No production implementation should begin before that contract is merged and the subsequent Analysis/Design establish a concrete repository-grounded implementation boundary.

## 12. Preservation

This analysis changes no production semantics, raw/canonical evidence, cursor behavior, frozen contract, writer/fencing authority, lineage/generation ownership, or historical artifact.

Historical evidence, contracts, golden vectors, tests, and valid implementations remain preserved.
