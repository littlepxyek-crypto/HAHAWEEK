# STEP 561 — V4 Submitted Authority Producer Contract v0.1

Status: CONTRACT
Step: 561
Precondition: STEP 560 BLOCKED / RECONCILED
Gate 2: PASS
V4 production activation: INACTIVE

## 1. Purpose

Define the missing authoritative submitted/live authority producer required to continue V4 production implementation without collapsing the distinction between:

1. submitted/live authority candidate; and
2. independently persisted durable expected authority.

This contract does not activate V4 production authority.

## 2. Repository-grounded baseline

Current `main` already provides:

- durable F-03 segment → manifest → checkpoint persistence;
- exact-range durable expected-authority reading;
- fail-closed provenance/linkage validation;
- structural production-authority validation;
- cryptographic authority binding;
- authority validation immediately before cursor advancement;
- single-writer fencing and legacy-write protection;
- deterministic batch processing and cursor advancement only after successful processing and authority authorization.

STEP 560 established that no independent submitted/live authority producer is currently defined.

## 3. Authority roles

The production boundary MUST preserve three distinct roles:

### 3.1 Submitted/live authority

A candidate commitment produced from the actual completed processing/evidence result for the exact processed range.

It is an input to the authority gate and is NOT the expected source.

### 3.2 Durable expected authority

The independently persisted F-03 chain resolved through `readF03AuthorityChain()`.

It remains the expected source and MUST NOT consume submitted authority as input.

### 3.3 Binding validator

`assertAuthorityBinding()` remains mandatory and compares the submitted commitment against the independently resolved expected commitment.

No role may be collapsed into another.

## 4. Submitted authority producer boundary

A subsequent implementation MUST introduce a dedicated producer boundary with an explicit interface equivalent to:

`produceSubmittedAuthority({ fromBlock, toBlock, processedEvidence })`

The exact code API is implementation detail, but the contract requirements below are mandatory.

The producer MUST:

1. accept the exact processed range;
2. consume the actual evidence/result of the completed processing operation;
3. identify the resulting segment commitment;
4. identify the manifest commitment;
5. identify the checkpoint commitment;
6. carry the exact generation;
7. carry the exact cursor boundary;
8. produce the required authority binding digest;
9. preserve provenance to the evidence that produced the candidate;
10. reject incomplete or internally inconsistent candidate material.

The producer MUST NOT call the durable expected-authority reader to manufacture its candidate.

## 5. Exact range and cursor boundary

For every candidate:

- `fromBlock` MUST equal the processed batch start;
- `toBlock` MUST equal the processed batch end;
- `cursorBlock` MUST equal the verified processed boundary represented by the committed segment;
- no candidate may authorize a block outside the successfully processed range;
- a candidate for a different range MUST fail closed;
- cursor regression MUST fail closed.

The producer MUST NOT infer a new range from persisted cursor state when the processing operation already supplies the exact range.

## 6. Commitment linkage

The submitted candidate MUST represent one internally coherent chain:

`segment → manifest → checkpoint → cursor boundary`

Required commitments:

- `segmentId`
- `manifestDigest`
- `checkpointDigest`
- `generation`
- `cursorBlock`
- `bindingDigest`

The candidate MUST be rejected when any commitment is missing, malformed, stale, conflicting, or inconsistent with the processed evidence.

## 7. Independence requirement

The submitted producer and durable expected-authority reader MUST remain independently sourced.

Prohibited:

- reading expected authority and returning it as submitted authority;
- copying expected commitments merely to satisfy binding;
- deriving expected commitments from submitted authority;
- accepting a self-referential authority object as both sides of the comparison;
- disabling the binding validator.

The implementation must preserve the existing `AUTHORITY_EXPECTED_SOURCE_MUST_BE_DISTINCT` boundary.

## 8. Persistence and ordering

The producer MUST NOT advance the runtime cursor.

Required ordering remains:

1. acquire single-writer authority;
2. process exact range;
3. persist required evidence/checkpoint artifacts;
4. produce the submitted authority candidate from the completed result;
5. resolve durable expected authority independently;
6. validate submitted authority;
7. validate cryptographic binding;
8. only then permit cursor advancement.

Any durability failure MUST prevent authorization/cursor advancement.

A producer failure MUST leave the existing cursor unchanged and permit deterministic retry of the same range.

## 9. Recovery and replay

The candidate producer MUST be deterministic for identical committed processing evidence and identical range/generation inputs.

Required negative cases:

- missing evidence;
- incomplete evidence;
- wrong range;
- stale generation;
- generation conflict;
- segment/manifest mismatch;
- manifest/checkpoint mismatch;
- checkpoint digest mismatch;
- cursor boundary mismatch;
- binding mismatch;
- durable expected authority missing;
- durable expected authority ambiguous;
- durable expected authority conflicting;
- interrupted persistence;
- restart followed by deterministic retry.

No recovery path may reset or rewrite the cursor.

## 10. Reorg semantics

The producer MUST consume only evidence belonging to the currently verified canonical processing boundary.

Orphaned/reorg-invalid evidence MUST NOT silently become a submitted authority candidate.

A reorg that invalidates the candidate's evidence MUST fail closed until a new canonical processing result establishes a new valid candidate according to the existing V4 evidence contracts.

Historical evidence MUST remain preserved.

## 11. Concurrency

The submitted producer MUST execute under the existing single-writer/fencing model.

It MUST NOT:

- create a second writer;
- bypass H-03 fencing;
- race cursor advancement;
- mutate evidence from a read-only verification path;
- accept stale producer output after ownership loss.

Writer loss or stale ownership MUST fail closed.

## 12. Provenance

The candidate MUST retain provenance sufficient to identify:

- processed range;
- evidence artifact identity;
- segment identity;
- manifest identity/digest;
- checkpoint identity/digest;
- generation;
- committed boundary;
- producer execution context required by the existing evidence contract.

No provenance may be silently normalized or regenerated after the fact.

## 13. V4 activation boundary

This contract defines a producer boundary only.

It does NOT:

- switch global V4 authority on;
- replace legacy authority;
- change RPC/provider selection;
- migrate the cursor;
- rewrite historical evidence;
- change frozen F-01..F-05 or H-01..H-05 contracts;
- introduce schema migration;
- authorize external publication, signing, prediction, ranking, or trading behavior.

Production activation remains a separate explicit acceptance boundary.

## 14. Required implementation tests

The implementation step following this contract MUST provide executable evidence for:

### Positive
- valid exact-range submitted authority;
- deterministic replay;
- valid binding against independently persisted expected authority;
- restart recovery;
- successful cursor advancement only after authorization.

### Negative
- missing candidate;
- malformed candidate;
- wrong range;
- cursor mismatch;
- generation conflict;
- segment mismatch;
- manifest mismatch;
- checkpoint mismatch;
- binding mismatch;
- missing expected authority;
- ambiguous expected authority;
- stale expected authority;
- durability failure;
- writer-fence failure;
- reorg-invalid evidence;
- attempted expected-source self-reference.

### Preservation
- existing F-01..F-05 golden vectors;
- existing H-01..H-05 regression matrix;
- existing Gate 2 evidence;
- no historical artifact mutation.

## 15. Acceptance criteria

STEP 561 contract is complete only when:

1. this contract is merged to `main`;
2. PR-head Tests are GREEN;
3. PR-head Security/Regression is GREEN;
4. review confirms source separation and fail-closed ordering;
5. merge evidence is recorded;
6. post-merge verification is performed;
7. reconciliation is documented;
8. the next step is explicitly recorded as the implementation step.

No submitted-authority production code is authorized by STEP 561 itself.

## 16. Traceability

Requirement → STEP 560 finding → STEP 561 contract → submitted-authority implementation → tests → Security/Regression → CI → review → merge → post-merge verification → reconciliation → next STEP.

## 17. Next STEP

STEP 562 — V4 Submitted Authority Producer Implementation.
