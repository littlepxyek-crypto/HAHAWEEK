# STEP 569 — Runtime Processing-Result Context Integration Boundary Contract v0.1

Status: CONTRACT
Step: 569
Predecessor: STEP 568
Gate 2: PASS
V4 production activation: INACTIVE

## 1. Purpose

Freeze the runtime integration boundary between canonical block processing and the durable processing-result persistence established by STEP 568.

STEP 569 defines how a completed canonical processing execution supplies the immutable processing-result context required by the persistence layer and, subsequently, by the submitted/live authority producer.

This step is contract-only. It does not activate V4 production authority, advance the cursor, manufacture generation, or implement the submitted authority producer.

## 2. Repository-observed current state

At the STEP 569 starting commit:

- `src/core/ingestion.js` invokes `processorRange(fromBlock,toBlock)`, then calls the authority gate and advances the cursor.
- `src/index.js` currently implements `processorRange` through `RawLogIngestion.ingestRange`, persists the database, and returns only ingestion counters.
- `src/core/raw-log-ingestion.js` persists raw events but does not construct a canonical processing-result context.
- `src/core/canonical-evidence.js` provides canonical-evidence construction, but the current runtime path does not construct and persist the accepted canonical evidence set as part of `processorRange`.
- `src/core/evidence-repository.js` provides immutable/conflict-detecting canonical-evidence persistence, but the current production `processorRange` wiring does not use it.
- STEP 568 provides durable `processing_results` and `processing_result_evidence` persistence through `persistProcessingResult` / `readProcessingResult`.
- The persistence contract requires a caller-supplied canonical processing context with exact range, generation, status, canonicality, evidence membership, transition lineage, provenance, and committed-at value.
- The current runtime processor does not yet provide that complete context.

Therefore STEP 569 freezes the missing integration boundary rather than inventing values inside the persistence layer.

## 3. Canonical processing-result context

The runtime canonical processor MUST produce one immutable context object for each accepted processing execution:

- `processingResultId`: non-empty immutable identity;
- `processingExecutionId`: non-empty identity for the execution;
- `parentResultId`: absent for `INITIAL`; required for `CONTINUATION` and `REORG_REPLACEMENT`;
- `transitionType`: exactly `INITIAL`, `CONTINUATION`, or `REORG_REPLACEMENT`;
- `fromBlock`, `toBlock`: exact inclusive processed range;
- `generation`: canonical-processing lineage value using the existing decimal uint64 representation;
- `status`: `ACCEPTED`;
- `canonicalityStatus`: `CANONICAL`;
- `canonicalEvidenceIds`: exact membership of the accepted canonical evidence set;
- `emptyResult`: explicit boolean; it MUST be true exactly when the accepted membership is empty;
- `provenance`: deterministic linkage to the processing execution, exact range, canonical evidence commitment, canonicality/reorg decision, and runtime contract/version;
- `committedAt`: repository-valid timestamp for the durable processing-result record.

The runtime context MUST be supplied to STEP 568 persistence without semantic rewriting or hidden defaults.

## 4. Context ownership

The canonical processing/reorg boundary owns:

1. determining the exact processed range;
2. determining which canonical evidence belongs to that range;
3. establishing canonical acceptance;
4. establishing reorg/replacement lineage;
5. obtaining the generation from canonical lineage;
6. assigning the processing-result and execution identities;
7. constructing deterministic provenance.

The durable persistence layer owns:

1. validating the supplied context;
2. validating and re-hashing referenced raw/canonical evidence;
3. deterministically ordering membership;
4. deriving and storing the frozen evidence-set digest;
5. enforcing idempotence and conflict detection;
6. enforcing parent/generation transition invariants;
7. durably committing the immutable result;
8. restoring the prior database snapshot on post-transaction save failure.

The persistence layer MUST NOT manufacture generation, canonicality, evidence membership, transition type, or processing identity.

## 5. Generation authority

Generation MUST originate from canonical processing lineage.

It MUST NOT be derived from:

- cursor state;
- wall-clock time;
- writer-fence value;
- runtime randomness;
- expected authority;
- checkpoint digest;
- arbitrary hash truncation;
- a constant/default such as `0`.

For `CONTINUATION`, generation MUST match the parent result.

For `REORG_REPLACEMENT`, generation MUST differ from the parent result and MUST be established by the canonical reorg/replacement process before persistence is called.

The submitted authority producer will consume the persisted context later; it MUST NOT decide generation transitions.

## 6. Evidence membership boundary

The canonical processor MUST pass the exact accepted canonical evidence identities.

It MUST NOT:

- reconstruct membership from the durable expected-authority chain;
- silently omit evidence;
- silently normalize conflicting evidence;
- reuse evidence that the canonical processing layer has marked invalid/replaced;
- include evidence outside the exact inclusive range.

An empty accepted result MUST be represented explicitly by `emptyResult: true` and an empty `canonicalEvidenceIds` array. Missing membership is not equivalent to an empty result.

The STEP 568 persistence layer remains authoritative for cryptographic validation of the referenced evidence and evidence-set digest.

## 7. Canonicality and reorg boundary

The runtime canonical-processing layer MUST establish canonicality before persistence.

A result MUST NOT be persisted as `ACCEPTED/CANONICAL` when:

- canonical acceptance is unknown or ambiguous;
- any referenced evidence is reorg-invalid;
- a replacement result is required but its new generation/parent lineage is unavailable;
- the exact canonical membership cannot be established;
- another writer owns the processing boundary.

Historical processing results MUST remain immutable. Reorg handling creates a new result with `REORG_REPLACEMENT`; it does not mutate or delete the parent result.

## 8. Writer ownership and ordering

The runtime integration MUST operate under the existing single-writer fence.

The required ordering is:

1. acquire/verify writer ownership;
2. process the exact range;
3. persist raw evidence required by the canonical result;
4. construct/validate the canonical processing-result context;
5. persist the immutable processing result through STEP 568;
6. only after successful processing-result durability may a submitted authority candidate be derived;
7. only after the authority boundary succeeds may the ingestion cursor advance.

The processing-result persistence layer does not advance the cursor.

The runtime integration MUST fail closed if writer ownership is lost before the durable processing-result commit completes.

## 9. Replay and recovery

For the same canonical execution:

- the same range, generation, transition lineage, processing-result identity, evidence membership, and provenance MUST resolve to the same durable processing result;
- replay MUST be idempotent through STEP 568;
- conflicting reuse of either result identity or execution identity MUST fail closed;
- restart MUST read the durable processing-result context rather than manufacture a new generation for an already accepted result.

If canonical state changed due to reorg, the runtime MUST establish a new replacement context rather than replaying the old canonical context.

## 10. Cursor boundary

The runtime integration MUST NOT advance the cursor merely because raw ingestion completed.

Cursor advancement is permitted only after:

- canonical processing succeeds;
- the processing result is durably accepted and independently verifiable;
- the submitted authority gate later succeeds for the exact same range.

A processing-result persistence failure MUST leave the cursor unchanged.

No cursor reset or historical rewrite is permitted.

## 11. Submitted authority integration boundary

STEP 569 does not implement the submitted/live authority producer.

The future producer MUST consume only a verified persisted processing-result context and its canonical evidence membership/commitment.

It MUST NOT:

- call `readF03AuthorityChain` as its source;
- call the durable expected-authority factory to manufacture submitted authority;
- copy generation or commitments from expected authority;
- mutate the cursor;
- decide canonical/reorg transitions.

The independent expected-authority path remains a separate verification source and is bound cryptographically only after the submitted candidate has been independently derived.

## 12. Deterministic provenance

The runtime context provenance MUST identify, at minimum:

- exact inclusive range;
- processing-result identity;
- processing-execution identity;
- generation;
- transition type and parent lineage where applicable;
- canonical evidence membership or its deterministic commitment;
- canonicality/reorg decision;
- processor contract/version;
- deterministic execution context sufficient for audit/replay.

The provenance MUST NOT contain nondeterministic fields whose variation would make an otherwise identical accepted result appear to be a different processing result.

The persistence layer will retain the supplied `committedAt` as an immutable audit field; its value is not part of the frozen evidence-set digest.

## 13. Failure semantics

The integration MUST fail closed on:

- missing context;
- malformed identities;
- invalid range;
- missing or malformed generation;
- ambiguous canonicality;
- reorg-invalid evidence;
- evidence outside the range;
- conflicting evidence identity;
- missing parent lineage;
- invalid generation transition;
- lost writer ownership;
- persistence conflict;
- durability/save failure.

No fallback to expected authority, cursor state, checkpoint state, wall-clock generation, or default generation is allowed.

## 14. Non-goals

STEP 569 does not:

- activate V4 production;
- change Gate 2;
- change frozen STEP 563 commitment formulas;
- change STEP 568 persistence schema or digest formula;
- implement the submitted authority producer;
- mutate cursor semantics;
- rewrite/delete historical evidence;
- add prediction, ranking, trading, or publication semantics;
- connect HAHAWEEK to any external project.

## 15. Acceptance criteria

1. The repository starting state is explicitly recorded and the missing runtime integration boundary is identified.
2. Ownership of context construction versus durable persistence is frozen.
3. Generation authority and transition semantics are frozen without manufacturing values.
4. Exact canonical evidence membership and empty-result semantics are frozen.
5. Canonicality/reorg acceptance and immutable replacement lineage are frozen.
6. Writer-fence, persistence-before-authority, and authority-before-cursor ordering is frozen.
7. Replay/recovery and fail-closed behavior are frozen.
8. Submitted authority remains independent from expected authority.
9. STEP 568 persistence and STEP 563 commitment semantics remain unchanged.
10. No production activation occurs.
11. A subsequent implementation step is explicitly identified: STEP 570 — Runtime Processing-Result Context Integration Implementation.

## 16. Traceability

Requirement → STEP 569 contract → future runtime integration code → integration/recovery/reorg tests → Security/Regression + CI → review → merge → post-merge verification → reconciliation → documentation → STEP 570.

