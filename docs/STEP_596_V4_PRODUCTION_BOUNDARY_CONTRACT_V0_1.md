# STEP 596 — V4 Production Boundary Contract v0.1

- Status: CONTRACT
- Step: 596
- Predecessor: STEP 595
- Baseline: 4664c44ee3d3d782790e46b7f5231e2e07a39de3
- Design Gate 2: PASS
- V4 production authority activation: INACTIVE

## Purpose

Define the explicit production-boundary contract required before any V4 production authority activation is considered.

This STEP establishes the authorization boundary only. It does not activate V4 production authority, perform a cutover, migrate production evidence, change cursor semantics, or introduce production runtime behavior.

## Canonical distinction

The repository must keep these states separate:

1. Design Gate 2 acceptance = PASS.
2. V4 engineering/implementation state = independently verified by applicable implementation evidence.
3. V4 production authority activation = INACTIVE until this production-boundary contract and all subsequent acceptance evidence authorize it.

Gate 2 PASS is therefore a prerequisite, not an activation command.

## Production-boundary principles

Any future V4 production activation must be:

- explicit and contract-authorized;
- fail-closed;
- evidence-backed and reproducible;
- deterministic at the defined boundary;
- compatible with existing authority, cursor, recovery, reorg, concurrency, and integrity semantics;
- auditable through repository artifacts and CI evidence;
- reversible only through a separately specified, evidence-preserving recovery contract;
- prohibited from silently rewriting or deleting historical evidence.

No activation may be inferred from documentation status, test success alone, or implementation presence.

## Preconditions

Before a future activation implementation may be authorized, the applicable lifecycle must establish evidence for at least:

1. Design Gate 2 remains PASS on current main.
2. V4 production implementation scope is explicitly identified.
3. Production authority owner and exact authority boundary are contractually identified.
4. Existing cursor and single-writer ownership remain unchanged unless a new contract explicitly authorizes a change.
5. Raw/canonical evidence preservation and historical compatibility are demonstrated.
6. Reorg and recovery behavior at the production boundary are specified and tested.
7. Durability and crash-recovery behavior are specified and tested.
8. Concurrency/fencing behavior is specified and tested.
9. Production activation failure conditions are enumerated with FAIL-CLOSED outcomes.
10. Operator Acceptance is satisfied from repository-grounded procedures.
11. Surveillance remains derived, evidence-linked, versioned, reproducible, and non-authoritative.
12. No temporal leakage, unsupported ownership/actor identity, predictive authority, automated trading/action, or new authority is introduced.

A missing or unverifiable prerequisite blocks activation.

## Activation boundary

The production boundary must explicitly identify, before implementation:

- the exact input authority;
- the exact output authority;
- the canonical evidence boundary;
- the cursor boundary;
- the writer/fencing boundary;
- the recovery/reorg boundary;
- the integrity verification boundary;
- the evidence and provenance required to declare activation successful;
- the STOP/FAIL-CLOSED conditions.

This contract does not invent those implementation details. They must be established from repository evidence in subsequent Analysis/Design work.

## Operator Acceptance

The operator must be able to determine from repository-grounded artifacts:

- whether V4 production authority is INACTIVE or explicitly authorized;
- what evidence is required before activation;
- what conditions force STOP/FAIL-CLOSED;
- how activation success would be verified;
- how failure/recovery preserves evidence and cursor integrity.

No command or procedure may be invented in this contract.

## Surveillance boundary

Surveillance remains strictly:

**derived + evidence-linked + versioned + reproducible + non-authoritative.**

It must not:

- mutate raw/canonical evidence;
- become a source of truth;
- advance the cursor;
- grant authority;
- perform automated action/trading;
- assert ownership or actor identity without evidence;
- use future evidence to influence prior formation detection.

**ADDRESS != ACTOR.**

Any future Surveillance change requires the full lifecycle.

## Explicit prohibitions

This STEP must not:

- activate V4 production authority;
- perform a live RPC cutover;
- migrate or rewrite production evidence;
- reset or advance the cursor;
- change authority ownership;
- add a writer or lock;
- alter frozen contracts;
- add a schema migration;
- add a dependency solely for activation;
- delete historical evidence;
- silently normalize data;
- introduce automated trading/action;
- introduce predictive/ranking authority.

## Acceptance criteria

STEP 596 Contract phase is accepted only when:

1. The production activation boundary is explicitly separated from Gate 2 PASS.
2. Activation remains INACTIVE.
3. Preconditions and fail-closed conditions are explicit without inventing implementation semantics.
4. Existing authority/cursor/evidence ownership is preserved.
5. Operator Acceptance is explicitly included.
6. Surveillance constraints are explicitly included.
7. Historical artifacts, frozen contracts, golden vectors, tests, and valid implementations remain untouched.
8. The contract is traceable to STEP 595 and becomes the sole contract baseline for subsequent STEP 596 Analysis/Design.
9. Contract PR, CI, review, merge, post-merge verification, reconciliation, and PROJECT_STATE documentation are completed.

## Next phase

After this contract is fully verified/reconciled, continue with STEP 596 Analysis → Design → Code only if the analysis establishes an authorized, repository-grounded implementation boundary.
