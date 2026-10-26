# STEP 580 — Runtime Canonical Lineage / Processing Context Integration Boundary Contract v0.1

Status: CONTRACT
Step: 580
Predecessor: STEP 579
Gate 2: PASS
V4 production activation: INACTIVE

## 1. Purpose

Freeze the boundary for integrating the verified STEP 579 runtime canonical lineage owner with the existing durable processing-result persistence.

STEP 580 defines ownership, data flow, replay, recovery, writer-fence ordering, and exact context semantics. It does not implement the runtime ingestion wiring, submitted authority producer, or cursor advancement.

## 2. Repository starting state

The starting main commit is `86ee596af71193a6bc3ab3e1cdceb2b86beac9b7`.

Repository inspection establishes:
- STEP 578 owns verified canonical block-decision persistence and exact snapshots.
- STEP 579 owns runtime canonical lineage, transition history, generation semantics, processing identities, and canonical evidence membership.
- `src/core/processing-result-persistence.js` owns durable validation, evidence-set digest, immutable result persistence, idempotence/conflict handling, and save-failure restoration.
- `src/core/ingestion.js` still advances the cursor after `processorRange` returns and invokes an authority gate independently.
- No production integration currently guarantees that the cursor/authority path consumes the exact verified STEP 579 processing context.
- V4 production activation remains INACTIVE.

## 3. Canonical integration object

The integration boundary MUST pass the verified STEP 579 result context without semantic rewriting:

- `processingResultId`
- `processingExecutionId`
- `parentResultId`
- `transitionType`
- `fromBlock`
- `toBlock`
- `generation`
- `status = ACCEPTED`
- `canonicalityStatus = CANONICAL`
- `canonicalEvidenceIds`
- `emptyResult`
- deterministic `provenance`
- immutable `committedAt`
- verified `evidenceSetDigest` returned by STEP 568 persistence

The integration layer MUST treat STEP 579 as the canonical owner and STEP 568 as the durable verifier/persistence owner.

## 4. Ownership

STEP 579 owns:
1. exact canonical range;
2. canonical decision snapshot selection;
3. canonical evidence membership;
4. canonical/reorg transition;
5. generation;
6. processing-result/execution identity;
7. canonical lineage provenance.

STEP 568 owns:
1. evidence integrity verification;
2. deterministic evidence-set ordering;
3. evidence-set digest;
4. immutable durable processing-result persistence;
5. replay/conflict detection;
6. save-failure recovery.

STEP 580 integration code owns only orchestration and context handoff. It MUST NOT recompute or replace canonicality, generation, transition type, identities, or evidence membership.

## 5. Runtime ordering

The implementation MUST enforce:

1. single-writer ownership;
2. exact raw ingestion required by the canonical range;
3. STEP 579 canonical lineage acceptance;
4. STEP 568 durable processing-result persistence;
5. verified processing-result reconstruction;
6. only then expose the result to any downstream authority gate;
7. only after successful authority acceptance may the cursor advance.

A raw-ingestion success without a verified processing result MUST NOT permit cursor advancement.

The integration MUST fail closed if writer ownership is lost between lineage acceptance and durable context verification.

## 6. Exact-range binding

The processing context MUST be bound to the exact inclusive range accepted by STEP 579.

Any authority/cursor operation receiving a different range MUST fail closed.

The integration MUST reject:
- missing range;
- reversed range;
- range mismatch between lineage and durable result;
- evidence membership outside the range;
- empty result mismatch;
- generation mismatch;
- parent mismatch;
- transition mismatch.

No silent clamping, truncation, shifting, or normalization is permitted.

## 7. Replay and recovery

For identical canonical state and exact processing inputs:
- processing-result identity remains deterministic;
- execution identity remains deterministic for the defined execution payload;
- replay is idempotent;
- durable result is read and verified after restart;
- no new generation is manufactured;
- no duplicate conflicting lineage is created.

If canonical state changes, the integration MUST use STEP 579 REORG_REPLACEMENT semantics and a distinct generation established by canonical lineage.

## 8. Authority and cursor boundary

STEP 580 MUST NOT implement or activate submitted/live authority.

It MUST expose a verified processing-result context suitable for a later authority integration step.

The existing expected-authority path MUST NOT become canonicality or generation authority.

The cursor MUST remain unchanged by the processing-context persistence layer. Cursor advancement remains downstream of successful authority acceptance for the exact same result/range.

## 9. Failure and rollback

Fail closed on:
- missing or corrupt canonical decision snapshot;
- missing or corrupt lineage;
- writer-fence loss;
- processing-result conflict;
- evidence integrity failure;
- identity conflict;
- generation/parent/transition mismatch;
- persistence/save failure;
- restart reconstruction mismatch.

On persistence failure, pre-operation durable state MUST be restored. Historical evidence, prior processing results, and transition history MUST NOT be deleted or rewritten.

## 10. Concurrency

The integration MUST use the existing single-writer fence and must not introduce a second competing writer authority.

Concurrent/reentrant processing of the same range must resolve deterministically:
- identical replay is idempotent;
- conflicting identity or lineage is rejected;
- cursor remains unchanged on failure.

## 11. Non-goals

STEP 580 does not:
- change STEP 573, STEP 576, STEP 578, or STEP 579 frozen semantics;
- change STEP 563 commitment formulas;
- implement submitted authority;
- advance/reset cursor;
- activate V4 production;
- delete/rewrite historical evidence;
- introduce prediction, ranking, trading, or publication semantics;
- connect HAHAWEEK to another project.

## 12. Acceptance criteria

1. Runtime integration ownership is explicit and repository-compatible.
2. STEP 579 context is handed to STEP 568 without semantic rewriting.
3. Exact range, generation, transition, parent, and evidence membership are bound and verified.
4. Writer-fence ordering is fail-closed.
5. Replay/restart reconstruct the same durable context.
6. Persistence failure restores pre-operation state.
7. Authority and cursor remain downstream and unchanged by this contract.
8. Expected authority is not promoted to runtime canonicality/generation authority.
9. No frozen formulas or historical evidence are modified.
10. V4 production activation remains INACTIVE.
11. Next step is explicitly identified as STEP 581 — Runtime Canonical Lineage / Processing Context Integration Analysis & Design.

## 13. Traceability

Requirement → STEP 580 contract → STEP 581 analysis/design → implementation → integration/recovery/reorg tests → Security/Regression + CI → review → merge → post-merge verification → reconciliation → documentation.
