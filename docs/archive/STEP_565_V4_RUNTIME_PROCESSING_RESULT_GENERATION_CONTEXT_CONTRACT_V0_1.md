# STEP 565 — V4 Runtime Processing-Result / Generation Context Boundary Contract v0.1

Status: CONTRACT
Step: 565
Predecessor: STEP 564
Gate 2: PASS
V4 production activation: INACTIVE

## Purpose

Freeze the boundary for a first-class runtime processing-result context required to supply generation and canonical-acceptance semantics consumed by the STEP 564 V4 evidence commitment derivation.

STEP 565 is a boundary-definition step. It does not activate V4 production authority and does not manufacture generation.

## Required context

A completed canonical processing result MUST expose, directly or through one immutable context object:

- processingResultId: immutable, non-empty identity;
- fromBlock, toBlock: exact inclusive processed range;
- generation: existing F-03 generation representation, decimal unsigned string bounded by the existing uint64 rule;
- status: explicit canonical acceptance state;
- canonicalEvidenceIds: exact membership of the accepted canonical evidence set;
- emptyResult: explicit declaration when the accepted range contains zero authority-eligible evidence;
- canonicality/reorg state sufficient to prove that the accepted evidence set is not invalidated or replaced at commitment time;
- deterministic linkage to the processing execution that produced the accepted result.

## Generation authority

Generation MUST originate from canonical processing lineage/context.

Generation MUST NOT be derived or manufactured from cursor state, wall-clock time, writer-fence value, runtime randomness, expected authority, checkpoint digest, arbitrary hash truncation, or a default value such as 0.

A generation transition MUST be established by canonical processing/reorg handling, not by the submitted authority producer.

## Durability boundary

The context MUST be immutable once accepted.

Before a submitted authority candidate can be returned, the processing result/context MUST have a durable commitment or equivalent repository-verifiable persistence boundary.

The exact persistence mechanism, schema, and recovery protocol are OUT OF SCOPE for STEP 565 and require a subsequent implementation contract if the repository does not already provide them.

## Fail-closed requirements

Missing, malformed, conflicting, non-canonical, reorg-invalid, ambiguous, or non-durable processing context MUST prevent authority commitment derivation.

No fallback to durable expected authority is permitted. No cursor mutation is permitted by the context provider.

## Replay / recovery

The same canonical evidence set + exact range + generation + processing-result identity MUST resolve to byte-equivalent context.

Restart MUST NOT silently create a different generation or processing-result identity for the same accepted canonical result.

## Non-goals

- no submitted authority producer implementation;
- no F-03 expected-authority read;
- no cursor advancement;
- no schema migration;
- no historical evidence rewrite/deletion;
- no V4 activation.

## Acceptance criteria

1. Repository inspection establishes whether an existing runtime context satisfies every required field and invariant.
2. If it does not, the gap is explicitly documented rather than filled with invented semantics.
3. Generation source and transition authority are frozen.
4. Durability/recovery boundary is explicit.
5. STEP 564 remains unchanged and reusable.
6. A subsequent implementation step is identified if repository implementation is required.
