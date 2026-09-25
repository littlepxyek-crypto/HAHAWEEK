# STEP 608 — Operator Reproducibility and Production-Boundary Contract v0.1

## Purpose

Establish the next contract boundary after STEP 607 for making HAHAWEEK reproducibly operable by an operator using only repository-supported behavior, while preserving all frozen technical semantics and keeping V4 production authority INACTIVE / BLOCKED.

## Repository Baseline

- STEP 607 is VERIFIED / RECONCILED / DOCUMENTED.
- The STEP 607 lifecycle/cursor crash-recovery evidence boundary is preserved.
- V4 production authority remains INACTIVE / BLOCKED.
- Existing lifecycle schema, deterministic lifecycle identity, authority binding, expected-vs-production authority distinction, cursor semantics, writer-fence ownership, raw/canonical evidence, historical lineage, and Surveillance boundary remain frozen.
- No production semantic change is authorized by this Contract.

## Scope

This Contract defines the evidence and acceptance boundary for reproducible operator operation:

1. repository-supported setup and execution entry points;
2. health/status inspection;
3. interpretation of authoritative output and evidence;
4. failure recognition and FAIL-CLOSED conditions;
5. repository-supported recovery and restart behavior;
6. recovery verification;
7. preservation of evidence and cursor state;
8. explicit STOP conditions;
9. traceable operator-facing documentation grounded only in existing repository behavior.

This Contract does not authorize invention of commands, operational shortcuts, fallback procedures, or undocumented recovery behavior.

## Required Invariants

- No cursor reset.
- No historical rewrite.
- No evidence deletion.
- No silent normalization.
- No second writer/lock.
- No fallback/default authority.
- No change to frozen lifecycle identity or authority binding.
- Cursor semantics remain unchanged.
- Durable evidence remains authoritative over derived projections.
- Ambiguous, conflicting, incomplete, or unverifiable recovery remains FAIL-CLOSED.
- Expected authority and production authority remain distinct.
- ADDRESS != ACTOR.
- Surveillance remains derived, evidence-linked, versioned, and non-authoritative.
- No automated action/trading or new authority.
- V4 production authority activation remains OUT OF SCOPE for this Contract.

## Evidence Boundary

The implementation must establish, from repository-supported behavior rather than assumptions:

Setup -> Run -> Health/Status -> Observe Evidence -> Detect Failure -> STOP/FAIL-CLOSED or Contract-Supported Recovery -> Verify Recovery -> Preserve Evidence/Cursor.

The implementation must not claim capabilities that are not directly supported by repository code, tests, CI evidence, or documentation.

## Operator Acceptance Matrix

At minimum, evidence must establish:

- reproducible setup from the repository;
- reproducible execution using an existing supported entry point;
- health/status inspection using an existing supported mechanism;
- recognizable successful and failed states;
- deterministic STOP/FAIL-CLOSED conditions;
- supported restart/recovery behavior;
- verification that recovery preserved evidence and cursor semantics;
- no undocumented command or recovery procedure was introduced.

If an operator-facing capability cannot be demonstrated from repository evidence, it remains UNKNOWN / NOT ACCEPTED and must not be presented as supported.

## Surveillance

No Surveillance implementation is authorized by this Contract.

Any Surveillance capability remains:
- derived;
- evidence-linked;
- versioned;
- non-authoritative;
- unable to mutate raw/canonical evidence;
- unable to advance the cursor;
- unable to create authority;
- unable to perform automated action/trading;
- unable to infer ownership or actor identity without evidence.

## Production Boundary

This Contract is a readiness/operator contract, not a production-authority activation contract.

Gate 2 PASS does not by itself activate V4 production authority.

Any future production-authority activation requires a separate explicit Contract defining that authority boundary and its acceptance criteria.

## Acceptance Criteria

This Contract is accepted only when:

- operator setup/run behavior is repository-grounded;
- health/status behavior is repository-grounded;
- output/evidence interpretation is traceable;
- failure and STOP/FAIL-CLOSED behavior is explicit and testable;
- recovery behavior is repository-grounded and verified;
- evidence/cursor preservation is demonstrated;
- no frozen technical semantics are changed;
- no historical evidence is rewritten or deleted;
- Surveillance remains non-authoritative;
- V4 production authority remains INACTIVE / BLOCKED;
- all changes are additive and traceable.

## Next Authorized Phase

After Contract acceptance: STEP 608 Analysis.
