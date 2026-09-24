# STEP 581 — Runtime Canonical Lineage / Processing Context Integration Design v0.1

Status: DESIGN
Step: 581
Predecessor: STEP 580
Contract: `docs/STEP_581_RUNTIME_CANONICAL_LINEAGE_PROCESSING_CONTEXT_INTEGRATION_ANALYSIS_DESIGN_CONTRACT_V0_1.md`
Analysis: `docs/STEP_581_RUNTIME_CANONICAL_LINEAGE_PROCESSING_CONTEXT_INTEGRATION_ANALYSIS_V0_1.md`
Baseline: `ea99db0886d03df884f96360d8b5e58fa7cf7495`
V4 production activation: INACTIVE

## 1. Design objective

Implement the smallest repository-compatible orchestration boundary that makes the STEP 580 ordering true:

raw exact range
→ canonical decision snapshot
→ STEP 579 canonical lineage acceptance
→ STEP 568 durable persistence and verification
→ verified exact processing context
→ authority binding
→ cursor advancement.

No existing semantic owner is duplicated.

## 2. Proposed production boundary

Introduce a dedicated integration function in the next implementation step, conceptually:

`processCanonicalRange({ fromBlock, toBlock, provider, database, writerFence, ... })`

Its responsibilities are orchestration only.

It MUST return a verified immutable context with at least:

`status`
`fromBlock`
`toBlock`
`processingResultId`
`processingExecutionId`
`parentResultId`
`transitionType`
`generation`
`canonicalEvidenceIds`
`emptyResult`
`evidenceSetDigest`
`lineageId`
`provenance`
`committedAt`

It MUST NOT recompute the values owned by STEP 579 or STEP 568.

## 3. Exact execution sequence

### Phase A — preconditions

1. Validate integer exact range.
2. Assert writer-fence ownership.
3. Reject reversed or invalid range.
4. Establish one processing execution scope.
5. Capture the pre-operation database snapshot.

Failure here means no downstream action.

### Phase B — canonical decision

1. Invoke `createCanonicalDecisionInput()` for the exact range.
2. Validate chain identity and confirmation depth.
3. Validate every block header and parent link.
4. Obtain/reconstruct the exact immutable snapshot.
5. Assert the snapshot range equals the requested range.

No raw log observation is allowed to override the snapshot.

### Phase C — raw ingestion

1. Ingest the exact range through `RawLogIngestion.ingestRange()`.
2. Persist raw evidence into the existing raw-event store.
3. Do not advance the cursor.
4. Do not invoke authority.

A raw-ingestion success is only an intermediate state.

### Phase D — canonical lineage

Invoke STEP 579 `acceptCanonicalLineage()` with the exact snapshot and range.

STEP 579 remains responsible for:
- canonical evidence construction;
- canonical membership;
- transition;
- generation;
- parent;
- processing identities;
- lineage identity.

The adapter must pass these values through unchanged.

### Phase E — durable verification

STEP 579 already calls STEP 568 persistence internally.

The returned lineage is reconstructed through `reconstructLineage()`, which cross-checks:
- range;
- parent;
- transition;
- generation;
- evidence-set digest;
- processing result.

The implementation MUST treat only a successfully reconstructed/verified lineage as a checkpoint-eligible processing context.

### Phase F — durable save boundary

The integration must preserve the existing database snapshot/restore behavior.

If any operation before successful durable save fails:
- restore the pre-operation snapshot;
- do not advance the cursor;
- do not invoke successful authority semantics;
- preserve all prior historical evidence.

If the operation succeeds, the resulting durable database contains the new immutable evidence/result/lineage state before downstream checkpointing.

### Phase G — authority binding

The existing authority gate remains the downstream authority boundary.

The future adapter should supply a context envelope that includes:
- exact `fromBlock/toBlock`;
- `processingResultId`;
- `processingExecutionId`;
- `generation`;
- `transitionType`;
- `parentResultId`;
- `lineageId`;
- `evidenceSetDigest`.

The authority implementation remains the authority source. Expected authority remains a distinct expected source.

The binding validator must reject a context whose range differs from both the requested range and authority range.

No authority result may alter canonicality or generation.

### Phase H — cursor

Only after successful authority validation of the exact verified context may the existing `cursor.advance(toBlock)` be called.

The cursor remains a downstream side effect.

The design deliberately does not expand `BlockCursor` with cryptographic fields because STEP 581 does not authorize a cursor-contract change.

## 4. Transaction and snapshot model

The implementation uses the existing database snapshot/restore primitive.

The operation boundary is:

`snapshot()`
→ canonical decision/raw/lineage/result writes
→ `save()`
→ verified reconstruction
→ downstream authority
→ cursor.

However, authority and cursor must not be treated as part of the database transaction.

If authority rejects after durable processing-result persistence has succeeded, the implementation MUST NOT delete or rewrite the newly created immutable historical result merely to make the cursor state appear contiguous.

Instead:
- cursor remains unchanged;
- durable verified processing context remains evidence;
- restart/reconciliation must discover the durable context;
- the next implementation step must define the precise recovery/retry behavior before claiming checkpoint completion.

This preserves evidence-first semantics.

## 5. Replay

Identical replay of the same canonical snapshot/range must resolve through STEP 579 deterministic identity and STEP 568 idempotent persistence.

Expected result:
- same `processingResultId`;
- same `processingExecutionId`;
- same `lineageId`;
- same evidence-set digest;
- no duplicate conflicting result;
- no new generation.

A conflicting payload must fail closed.

## 6. Reorg replacement

When the canonical snapshot changes:

1. do not mutate the prior result;
2. STEP 579 determines `REORG_REPLACEMENT`;
3. STEP 579 requires a new generation;
4. the new result is persisted as a new immutable result;
5. prior history remains untouched;
6. downstream authority receives only the new exact context;
7. cursor remains unchanged until the downstream authority boundary succeeds.

No reorg logic is duplicated in ingestion.

## 7. Concurrency

The existing `single-writer-fence.js` remains the sole write authority.

Required fence assertions:

- before canonical decision state that depends on writer ownership;
- before lineage mutation;
- before processing-result persistence;
- before durable save;
- before returning a verified context;
- immediately before authority;
- immediately before cursor advancement.

If ownership is lost, fail closed.

The integration must not introduce a second mutex, lock file, or writer authority.

## 8. Failure matrix

| Point | Failure | Required behavior |
|---|---|---|
| precondition | invalid range | reject |
| canonical decision | missing/malformed snapshot | reject |
| raw ingestion | RPC/persistence failure | restore; no cursor |
| lineage | identity/generation/parent mismatch | restore; no cursor |
| persistence | conflict/digest failure | restore; no cursor |
| save | filesystem failure | restore; no cursor |
| reconstruction | lineage/result mismatch | reject; no cursor |
| writer fence | ownership lost | fail closed |
| authority | exact-context mismatch | cursor unchanged |
| cursor | regression/write failure | fail closed and preserve durable evidence |
| restart | durable context mismatch | fail closed |
| reorg | same-generation replacement | reject |

## 9. Test design for implementation step

### Positive

1. exact canonical range creates one verified context;
2. empty canonical evidence produces explicit `emptyResult=true`;
3. deterministic replay returns the same identities;
4. restart reconstructs the same durable lineage;
5. continuation preserves parent generation;
6. reorg replacement creates a distinct generation;
7. historical transition records remain append-only.

### Negative

1. snapshot range mismatch;
2. missing snapshot;
3. reversed range;
4. invalid canonical evidence;
5. evidence-set digest tampering;
6. parent mismatch;
7. generation mismatch;
8. transition mismatch;
9. processing-result identity conflict;
10. writer-fence loss;
11. save failure;
12. authority range mismatch;
13. authority context mismatch;
14. cursor regression;
15. concurrent conflicting same-range processing.

### Integration regression

The implementation must prove that:
- raw ingestion alone cannot advance the cursor;
- authority cannot consume a non-verified processing context;
- expected authority is not used as canonicality authority;
- old historical evidence remains present after reorg;
- no cursor reset occurs;
- existing STEP 568/579 golden vectors remain unchanged.

## 10. Security requirements

No new trust root is introduced.

The trust chain is:

canonical decision snapshot
→ canonical lineage
→ durable evidence/result verification
→ exact-context authority binding
→ cursor.

Any broken edge is a hard failure.

The design forbids:
- fallback from failed canonical verification to raw-log success;
- fallback generation;
- fallback parent;
- authority-derived canonicality;
- cursor-derived generation;
- silent range normalization;
- historical deletion to repair state.

## 11. Observability and evidence

The implementation should emit structured evidence references, not mutable status assertions.

Minimum trace fields:
- exact range;
- snapshot ID;
- processing result ID;
- processing execution ID;
- lineage ID;
- transition type;
- generation;
- evidence-set digest;
- writer-fence ownership outcome;
- durable save outcome;
- authority binding outcome;
- cursor outcome.

Logs must not be treated as the canonical state. Durable repository/database evidence remains authoritative.

## 12. Scope boundary

STEP 581 does not authorize:
- production code changes;
- schema changes;
- V4 activation;
- submitted/live authority implementation;
- cursor API redesign;
- new dependencies;
- deletion or rewriting of evidence;
- unrelated architecture.

Those belong to the implementation step and its explicit acceptance criteria.

## 13. Traceability

`STEP 580 Contract`
→ `STEP 581 Contract`
→ `STEP 581 Analysis`
→ `STEP 581 Design`
→ future implementation contract/code
→ integration/recovery/reorg tests
→ Security/Regression
→ CI
→ review
→ merge
→ post-merge verification
→ reconciliation
→ documentation.

## 14. Implementation readiness decision

The analysis and design establish a bounded implementation path using existing repository primitives.

No Gate 2 production activation decision is made here.

V4 production activation remains INACTIVE.

Next step: implementation of the frozen integration design under a new implementation contract.
