# STEP 581 — Runtime Canonical Lineage / Processing Context Integration Analysis v0.1

Status: ANALYSIS
Step: 581
Predecessor: STEP 580
Contract: `docs/STEP_581_RUNTIME_CANONICAL_LINEAGE_PROCESSING_CONTEXT_INTEGRATION_ANALYSIS_DESIGN_CONTRACT_V0_1.md`
Repository baseline: `ea99db0886d03df884f96360d8b5e58fa7cf7495`
V4 production activation: INACTIVE

## 1. Executive finding

The repository already contains the two required semantic owners, but the production call graph still stops at raw-log persistence.

- STEP 579's `acceptCanonicalLineage()` can reconstruct/validate the exact canonical decision snapshot, derive deterministic processing identities, build canonical evidence membership, persist the immutable processing result, persist canonical lineage, and fail closed on writer-fence loss or persistence failure.
- STEP 568's `persistProcessingResult()` verifies raw/canonical evidence, derives the frozen evidence-set digest, enforces immutable/idempotent persistence and restores the database snapshot on save failure.
- `src/index.js` currently calls `RawLogIngestion.ingestRange()`, then `database.save()`, and returns raw ingestion counters. It does not construct a canonical decision snapshot, invoke `acceptCanonicalLineage()`, or expose a verified processing-result context.
- `src/core/ingestion.js` treats a successful `processorRange()` return as sufficient to call `authorityGate()` and then advance the cursor. The current return value does not carry the exact verified STEP 579/568 result.
- Therefore the present ordering is insufficient for STEP 580's required boundary: raw persistence can complete without a verified canonical processing result.

## 2. Observed call graph

Current production path:

`IngestionEngine.runOnce()`
→ `processorRange(fromBlock,toBlock)`
→ `RawLogIngestion.ingestRange()`
→ raw-event persistence
→ `database.save()`
→ returns counters
→ `authorityGate({ checkpointCommitted:true, fromBlock,toBlock,blockNumber:toBlock })`
→ `cursor.advance(toBlock)`

Required future path:

`IngestionEngine.runOnce()`
→ canonical processing-context processor
→ exact canonical decision snapshot
→ raw ingestion for exact range
→ `acceptCanonicalLineage()`
→ `persistProcessingResult()`
→ reconstruct/verify immutable context
→ exact-result authority binding
→ cursor advance

The future path must not permit the old counter-only success signal to satisfy the authority/cursor boundary.

## 3. Ownership analysis

### 3.1 Canonical decision input

`canonical-decision-input.js` is the source of the accepted block-hash snapshot. It validates chain identity, confirmation depth, exact range, block headers, parent links, and snapshot identity.

It is an input to lineage, not an authority result.

### 3.2 Runtime canonical lineage

`runtime-canonical-lineage.js` owns:
- transition type;
- generation;
- parent relationship;
- canonical evidence membership;
- processing-result identity;
- processing-execution identity;
- lineage identity;
- immutable transition history;
- canonical lineage reconstruction.

No downstream component may recompute these fields.

### 3.3 Durable processing result

`processing-result-persistence.js` owns:
- supplied-context validation;
- evidence re-verification;
- deterministic evidence ordering;
- evidence-set digest;
- immutable result persistence;
- replay/conflict detection;
- save-failure restoration.

The persistence layer must continue to reject missing or manufactured generation, canonicality, membership, or identity.

### 3.4 Authority

`f03-ingestion-authority-integration.js` requires separate authority and expected-authority sources and validates exact `fromBlock/toBlock` binding.

STEP 581 design must add result-context binding without turning expected authority into canonicality or generation authority.

### 3.5 Cursor

`block-cursor.js` is a downstream checkpoint writer. It currently knows only the block number. STEP 581 does not change the cursor contract; instead the caller must prove the exact verified context before invoking the existing downstream checkpoint operation.

## 4. Critical gaps

### GAP-01 — canonical snapshot acquisition is absent from processorRange

Current `src/index.js` does not call `createCanonicalDecisionInput()`.

Consequence: there is no verified block-hash snapshot available to STEP 579.

Required remediation belongs to the next implementation step.

### GAP-02 — raw ingestion and canonical processing are not one verified processing unit

Current `database.save()` commits raw events before canonical lineage/result verification.

The next implementation must establish a transaction/snapshot boundary such that a failed canonical-processing stage cannot be reported as a successful checkpoint.

Because sql.js persistence is file-based through `database.save()`, the implementation should use the existing database snapshot/restore mechanism around the whole processing-context operation rather than inventing a second persistence mechanism.

### GAP-03 — authority receives only checkpoint metadata

Current authority input is:

`{ checkpointCommitted, fromBlock, toBlock, blockNumber }`.

This does not bind authority to:
- processingResultId;
- processingExecutionId;
- generation;
- transition;
- evidence-set digest;
- canonical lineage identity.

The next implementation must add a verified-context binding object while preserving the existing exact-range authority contract.

### GAP-04 — cursor advancement is not cryptographically/contextually bound

The current cursor API accepts only a block number.

The design must therefore place the verification barrier before `cursor.advance()`. A cursor API redesign is not authorized by STEP 581 and should not be introduced unless a future implementation acceptance criterion proves it necessary.

### GAP-05 — restart reconstruction exists below the ingestion boundary

STEP 568 can read and verify a durable processing result, and STEP 579 can reconstruct lineage. The missing piece is startup/restart orchestration that uses the verified durable context before allowing the same range to be considered successfully checkpointed.

This is an implementation concern, not a reason to rewrite historical records.

## 5. Exact-range and identity binding

The following values must flow unchanged from STEP 579 into STEP 568 and then downstream:

- `fromBlock`
- `toBlock`
- `generation`
- `transitionType`
- `parentResultId`
- `processingResultId`
- `processingExecutionId`
- `canonicalEvidenceIds`
- `emptyResult`
- deterministic provenance
- `evidenceSetDigest`

The authority boundary must reject any context whose range differs from the processor's exact range.

No component may:
- clamp a range;
- fill missing generation;
- infer a parent;
- substitute a different evidence set;
- recalculate canonicality from raw RPC log presence;
- replace a reorg generation with the prior generation.

## 6. Failure analysis

The following conditions are mandatory fail-closed stops:

| Failure | Required result |
|---|---|
| canonical snapshot missing | no authority, no cursor |
| snapshot range mismatch | no authority, no cursor |
| writer fence lost | restore pre-operation state; no cursor |
| canonical evidence invalid | restore pre-operation state; no cursor |
| processing-result conflict | restore/reject; no cursor |
| evidence-set digest mismatch | reject; no cursor |
| lineage/result mismatch | reject; no cursor |
| authority range mismatch | no cursor |
| authority binding mismatch | no cursor |
| save failure | restore snapshot; no cursor |
| restart reconstruction mismatch | reject; no cursor |
| concurrent same-range conflicting identity | reject; no cursor |

Historical evidence and immutable lineage transitions must remain untouched during all failure paths.

## 7. Reorg analysis

STEP 579 already establishes `REORG_REPLACEMENT` and requires a distinct generation.

The integration must therefore:
1. obtain the accepted canonical snapshot;
2. let STEP 579 determine the transition/generation;
3. persist the replacement result through STEP 568;
4. verify the resulting lineage/result;
5. only then expose the context downstream.

The integration must never infer reorg state from cursor movement or expected authority.

## 8. Concurrency analysis

The repository has one explicit writer fence. STEP 581 must retain it as the sole writer authority.

The future implementation should assert ownership:
- before canonical snapshot acquisition where applicable;
- before lineage mutation;
- before persistence;
- before durable save;
- immediately before downstream authority evaluation;
- immediately before cursor advancement.

A second lock/fence would create competing ownership semantics and is therefore out of scope.

## 9. Restart/recovery analysis

The restart invariant is:

`persisted verified context + exact range + unchanged canonical state`
→ same processing identity
→ same execution identity
→ same evidence-set digest
→ no new generation
→ idempotent replay.

If canonical state has changed, the normal reorg replacement path must create a new generation rather than mutating the old result.

## 10. Security/regression implications

The primary security boundary is semantic substitution.

Tests must detect attempts to substitute:
- expected authority for canonicality;
- raw ingestion success for verified processing success;
- a different range;
- a different generation;
- a different evidence set;
- a different parent;
- a different transition;
- a different processing identity.

The implementation must not weaken any existing security check to accommodate the new call path.

## 11. Analysis conclusion

STEP 580's frozen boundary is implementable using the existing repository primitives.

No schema extension is required by the analysis.

The principal implementation change is orchestration:
`canonical decision → raw ingestion → runtime canonical lineage → durable verified result → exact-context authority gate → cursor`.

The next implementation step should introduce the smallest possible adapter/orchestration boundary, preserve existing owners, and prove the new ordering with negative and recovery tests before any V4 activation consideration.

V4 production activation remains INACTIVE.
