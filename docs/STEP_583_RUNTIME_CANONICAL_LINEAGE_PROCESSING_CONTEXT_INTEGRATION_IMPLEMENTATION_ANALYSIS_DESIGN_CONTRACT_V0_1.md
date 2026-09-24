# STEP 583 — Runtime Canonical Lineage / Processing Context Integration Implementation Analysis & Design Contract v0.1

Status: CONTRACT
Step: 583
Predecessor: STEP 582
Baseline: 8e150f483b5070349ff330738de9e240c0532082
V4 production activation: INACTIVE

## 1. Purpose

Define the analysis and design boundary required before implementing the STEP 582 runtime integration.

The analysis/design MUST be repository-grounded and MUST determine the smallest production implementation that satisfies the frozen STEP 582 contract without inventing new canonicality, generation, authority, cursor, persistence, or concurrency semantics.

This STEP authorizes analysis and design only. It does not authorize production runtime changes.

## 2. Required repository inspection

The analysis MUST inspect the actual current main implementation and call graph for:
- `src/index.js`;
- `src/core/ingestion.js`;
- canonical decision input ownership;
- STEP 579 runtime canonical lineage;
- STEP 568 durable processing-result persistence/reconstruction;
- existing authority integration;
- `block-cursor.js`;
- existing database snapshot/restore primitives;
- existing single-writer fence;
- relevant tests, fixtures, golden vectors, and recovery/reorg/concurrency evidence.

The repository at the STEP 583 baseline is the source of truth.

## 3. Required analysis

The analysis MUST document:
1. current runtime call graph;
2. exact ownership of every field in the verified processing context;
3. current gaps against STEP 582;
4. exact integration points;
5. transaction/snapshot boundaries;
6. replay and restart behavior;
7. reorg replacement behavior;
8. concurrency and writer-fence behavior;
9. authority binding requirements;
10. cursor advancement barrier;
11. failure-closed matrix;
12. test impact and regression coverage;
13. security/trust-chain implications;
14. observability required to diagnose operator-visible runtime states.

The analysis MUST explicitly identify whether the current CLI/runtime entry points expose enough information for an operator to understand:
- whether HAHAWEEK is running;
- what exact range was processed;
- whether processing was verified;
- whether authority was accepted;
- whether the cursor advanced;
- why processing stopped on failure.

This is an observability analysis only; it MUST NOT expand this STEP into a new UI or alter runtime semantics.

## 4. Required design

The design MUST specify:
- the smallest orchestration boundary;
- exact function/module ownership;
- exact input/output contract;
- exact ordering from canonical decision through cursor;
- database snapshot/restore handling;
- authority context binding;
- replay/restart/reorg/concurrency behavior;
- negative-path behavior;
- tests and fixtures;
- security/regression verification;
- CI and merge requirements;
- post-merge verification and reconciliation.

The design MUST reuse existing repository primitives and MUST NOT introduce a second writer fence, duplicate semantic owner, or new persistence mechanism.

## 5. Explicit prohibitions

This STEP MUST NOT:
- modify production runtime code;
- modify schemas or migrations;
- modify cursor semantics;
- activate V4;
- change STEP 568/579 frozen semantics;
- delete/rewrite historical evidence;
- reset cursor state;
- silently normalize ranges;
- introduce fallback generation/parent/canonicality;
- use expected authority as canonicality authority;
- add unrelated dependencies;
- make tests weaker to obtain green CI.

## 6. Acceptance criteria

STEP 583 analysis/design is accepted only when:
- this contract is merged;
- repository-grounded analysis is committed;
- concrete implementation design is committed;
- every STEP 582 acceptance requirement has an explicit implementation/test mapping;
- operator-visible observability gaps are identified without changing runtime semantics;
- no production code/schema/cursor/evidence/V4 changes occur;
- Tests pass;
- Security/Regression passes;
- CodeQL/required CI passes;
- review evidence exists;
- merge succeeds;
- exact merge commit is post-merge verified;
- reconciliation/documentation records the next implementation STEP.

## 7. V4 boundary

V4 production activation remains INACTIVE.

No Gate 2 PASS may be claimed from this analysis/design STEP.

## 8. Traceability

STEP 581 frozen analysis/design
→ STEP 582 implementation contract
→ STEP 583 analysis/design contract
→ STEP 583 analysis
→ STEP 583 design
→ implementation contract
→ implementation
→ tests
→ security/regression
→ CI
→ review
→ merge
→ post-merge verification
→ reconciliation
→ documentation.

Next after STEP 583 is the explicit implementation contract STEP defined by the completed analysis/design.
