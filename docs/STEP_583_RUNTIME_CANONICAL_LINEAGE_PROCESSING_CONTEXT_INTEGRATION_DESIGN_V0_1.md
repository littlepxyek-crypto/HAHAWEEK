# STEP 583 — Runtime Canonical Lineage / Processing Context Integration Implementation Design v0.1

Status: DESIGN
Step: 583
Predecessor: STEP 582
Baseline: `8e71caf7a3789763bce390e3dbc2cf6ca7f3a8cd`
Analysis: `docs/STEP_583_RUNTIME_CANONICAL_LINEAGE_PROCESSING_CONTEXT_INTEGRATION_IMPLEMENTATION_ANALYSIS_V0_1.md`
Contract: `docs/STEP_583_RUNTIME_CANONICAL_LINEAGE_PROCESSING_CONTEXT_INTEGRATION_IMPLEMENTATION_ANALYSIS_DESIGN_CONTRACT_V0_1.md`
V4 production activation: INACTIVE

## 1. Design objective

Implement the smallest repository-compatible orchestration boundary that makes STEP 582 executable without duplicating semantic ownership.

Target flow:

IngestionEngine.runOnce
→ processCanonicalRange
→ canonical decision snapshot
→ exact raw ingestion
→ STEP 579 acceptCanonicalLineage
→ STEP 568 verified processing result
→ verified immutable processing context
→ exact authority binding
→ cursor advance.

## 2. Proposed module boundary

Add one integration module, conceptually:

`src/core/runtime-processing-context.js`

Primary function:

`processCanonicalRange({ provider, database, writerFence, fromBlock, toBlock, confirmations, chainId, rawLogs, relevantLogFilter, ... })`

The module is an orchestration adapter only.

It MUST import:
- `createCanonicalDecisionInput`;
- `acceptCanonicalLineage`;
- existing raw ingestion capability;
- existing database snapshot/restore;
- existing writer fence.

It MUST NOT reimplement:
- canonicality;
- generation;
- transition;
- evidence identity;
- processing-result identity;
- evidence-set digest;
- persistence semantics.

## 3. Input and output

Input:
- exact `fromBlock`;
- exact `toBlock`;
- provider;
- database;
- writer fence;
- confirmations;
- chain ID;
- raw ingestion dependency/filter;
- deterministic provenance inputs.

Output is an immutable verified context:

```
{
  status: 'VERIFIED',
  fromBlock,
  toBlock,
  processingResultId,
  processingExecutionId,
  parentResultId,
  transitionType,
  generation,
  canonicalEvidenceIds,
  emptyResult,
  evidenceSetDigest,
  lineageId,
  provenance,
  committedAt,
  canonicalDecisionSnapshotId
}
```

Values are obtained from the reconstructed STEP 579/568 lineage/result and passed through unchanged.

## 4. Execution algorithm

### Phase A — Preconditions

- Validate safe integer exact range.
- Reject reversed range.
- Assert writer fence.
- Capture `database.snapshot()`.

### Phase B — Canonical decision

Call:

`createCanonicalDecisionInput({ provider, db: database.db, writerFence, chainId, confirmations, fromBlock, toBlock })`

Require:
- returned snapshot exists;
- snapshot range equals requested range;
- snapshot identity is internally reconstructable.

No raw log data can replace the snapshot.

### Phase C — Raw ingestion

Call the existing `RawLogIngestion.ingestRange()` with the exact range and existing relevant filter.

Do not call authority.
Do not advance cursor.

Do not treat returned counters as checkpoint success.

### Phase D — Canonical lineage / durable result

Call:

`acceptCanonicalLineage({ database, writerFence, canonicalDecisionSnapshot, fromBlock, toBlock, ... })`

Transition, parent, and generation must come from the existing STEP 579 lineage owner.

The adapter must not manufacture them.

### Phase E — Verification

Require `acceptCanonicalLineage()` to return reconstructed verified lineage/result.

Validate:
- status VERIFIED;
- exact range;
- processingResultId present;
- processingExecutionId present;
- generation present;
- evidence-set digest present;
- lineageId present;
- canonical evidence IDs are deterministic;
- provenance contains the canonical decision snapshot ID.

Return the verified context.

## 5. Transition selection

The adapter must not select transition/generation.

Because `acceptCanonicalLineage()` currently accepts transition/generation explicitly, the implementation must use the existing authoritative transition-resolution semantics already provided by STEP 579 rather than inventing defaults.

If the existing public API cannot derive the correct transition from persisted lineage for the requested range, the implementation must stop at analysis/contract and add the smallest explicit STEP 579-compatible resolver under a new implementation contract. It must not use:
- `INITIAL` as a fallback;
- cursor-derived generation;
- authority-derived generation;
- timestamp/random generation;
- expected authority as canonicality.

## 6. Outer durability boundary

The adapter captures a snapshot before canonical decision acquisition.

On any failure before durable processing result/lineage is committed:
- restore the outer snapshot;
- do not call authority;
- do not advance cursor.

After successful STEP 579/568 durable persistence:
- do not delete historical result if authority later rejects;
- keep cursor unchanged;
- expose the verified context for reconciliation/retry.

The database snapshot is an in-memory recovery mechanism, not a second persistence system.

## 7. Authority integration design

Extend the existing authority gate input minimally:

```
{
  fromBlock,
  toBlock,
  checkpointCommitted: true,
  processingContext
}
```

The gate must require:
- `processingContext.status === 'VERIFIED'`;
- exact range equality;
- context generation equals independently sourced authority generation;
- authority cursorBlock equals `toBlock`;
- existing expected-authority binding remains unchanged.

The gate must not derive or overwrite context generation, lineage, result identity, or canonicality.

If the authority gate cannot safely bind these values without changing a frozen authority contract, stop and define that change as a new contract rather than silently altering semantics.

## 8. IngestionEngine barrier

Change only the success boundary:

Current:

`await processorRange()`
→ `authorityGate(checkpointCommitted=true,...)`
→ `cursor.advance()`.

Target:

`const context = await processorRange()`
→ `authorityGate({ checkpointCommitted:true, fromBlock,toBlock,blockNumber:toBlock, processingContext:context })`
→ `cursor.advance(toBlock)`.

The engine must require the authority gate to succeed before cursor advancement.

No cursor API redesign is required.

## 9. Operator result design

The existing `runOnce()` result should be extended only with derived verified execution metadata already returned by the processing context, for example:
- last verified processing result ID;
- last lineage ID;
- last transition;
- last generation;
- last evidence-set digest;
- authority status;
- cursor outcome.

These are projections of authoritative context, not new state.

Console output should distinguish:
- RAW INGESTED;
- VERIFIED;
- AUTHORIZED;
- CURSOR ADVANCED;
- FAILED / CURSOR NOT ADVANCED.

No log field becomes canonical state.

## 10. Restart design

On restart:
1. cursor points to last checkpointed block;
2. the next exact range is computed;
3. processing context is reconstructed deterministically;
4. if an identical durable result already exists, STEP 568/579 returns the same identity;
5. authority is re-evaluated;
6. cursor advances only after successful authority.

No duplicate conflicting result is created.

If canonical snapshot differs, normal STEP 579 reorg semantics apply.

## 11. Reorg design

Reorg replacement is entirely delegated to STEP 579:
- new generation;
- new processing result;
- new lineage;
- prior result preserved.

The adapter only transports the exact canonical snapshot and returns the verified result.

## 12. Concurrency design

Use the existing writer fence only.

Required assertions:
- before canonical decision;
- before raw/lineage mutation;
- before durable save/return;
- immediately before authority;
- immediately before cursor.

If ownership is lost, fail closed.

## 13. Test design

Add focused tests in the existing repository test style.

### Positive
- exact range produces VERIFIED context;
- empty result is explicit;
- deterministic replay returns identical IDs/digest;
- restart after durable result is idempotent;
- continuation preserves generation/parent;
- reorg creates new generation and preserves old history.

### Negative
- range mismatch;
- missing snapshot;
- raw ingestion failure;
- evidence/digest tampering;
- parent/generation/transition mismatch;
- writer-fence loss;
- save failure;
- authority generation mismatch;
- authority cursor/range mismatch;
- cursor regression;
- concurrent same-range conflict.

### Boundary
- raw-only processor cannot advance cursor;
- unverified context cannot reach cursor;
- expected authority cannot establish canonicality;
- prior historical evidence remains after reorg;
- existing STEP 568/579 vectors unchanged.

## 14. Security design

Trust chain:

canonical decision
→ raw evidence
→ canonical lineage
→ durable result verification
→ authority binding
→ cursor.

Every edge is fail-closed.

No fallback source is permitted for canonicality, generation, parent, evidence membership, or processing identity.

## 15. CI and completion mapping

Implementation STEP must require:
- `npm test`;
- `npm run verify:v4`;
- `npm run verify:v4:coverage`;
- dependency audit;
- tracked-secret detection;
- repository Security/Regression workflow;
- CodeQL;
- exact-head PR evidence;
- exact merge-commit post-merge evidence.

V4 remains INACTIVE.

## 16. Operator usability boundary

This design directly addresses the identified operator gap without introducing a separate UI:

After implementation, a normal operator should be able to run the existing command and see enough information to answer:
1. What range did HAHAWEEK process?
2. Was it VERIFIED?
3. What result/lineage/generation was verified?
4. Was authority accepted?
5. Did the cursor advance?
6. If not, why?

A dedicated interactive dashboard is not required for this implementation and remains outside scope unless a later contract authorizes it.
