# STEP 606 — Production Authority Lifecycle Failure-Atomicity Contract v0.1

- Phase: CONTRACT
- Predecessor: STEP 605 — V4 Production Authority Activation Readiness
- Baseline: `18baa3849cf2c7c487fb76de45b37ed08fc6459c`
- Gate 2: PASS
- V4 production authority: INACTIVE / BLOCKED

## 1. Purpose

Define the smallest repository-grounded contract for proving failure-atomicity across the established production-authority lifecycle boundary before any V4 activation decision.

The contract addresses the unresolved STEP 605 Analysis finding: lifecycle persistence → final authority validation → cursor advancement is not yet proven safe under crash/restart, reorg/replacement, and concurrency conditions.

## 2. Scope

This contract authorizes analysis of the existing implementation only for:

- failure-atomic ordering between durable lifecycle persistence, final authority validation, and cursor advancement;
- crash/restart behavior at each relevant boundary;
- reorg/replacement interaction with lifecycle durability and immutable evidence;
- writer-fence/concurrency behavior;
- preservation of expected-authority versus production-authority separation;
- cursor non-advancement on failed/uncertain lifecycle completion;
- Operator Acceptance observability using only repository-defined behavior;
- Surveillance boundary preservation.

The next phase after Contract is **Analysis**.

## 3. Explicit non-scope

This contract does not authorize:

- V4 production activation;
- changing frozen lifecycle schema, identity, or binding formulas;
- changing cursor semantics;
- changing raw/canonical evidence;
- changing writer-fence ownership;
- adding a second writer or lock;
- inventing recovery procedures;
- cursor reset;
- historical rewrite/deletion;
- silent normalization;
- fallback/default authority;
- automated action/trading;
- predictive/ranking authority;
- Surveillance authority or actor/ownership inference;
- production implementation before Analysis and Design are complete.

## 4. Required Analysis Questions

Analysis must establish, from repository evidence:

1. Exact durable lifecycle commit ordering relative to final authority validation.
2. Crash points and durable states before/after each ordering boundary.
3. Restart behavior and whether replay remains idempotent and evidence-preserving.
4. Reorg/replacement behavior and predecessor/lineage preservation.
5. Concurrent writer behavior under the existing writer fence.
6. Whether any failed or uncertain lifecycle operation can advance the cursor.
7. Whether durable lifecycle evidence can exist ahead of the cursor without requiring deletion or reset.
8. Whether expected authority can be confused with production authority.
9. Whether existing operator-visible status/evidence is sufficient to recognize STOP/FAIL-CLOSED conditions.
10. Whether Surveillance remains strictly derived and non-authoritative.

## 5. Required Analysis Output

Analysis must produce:

- a state/ordering matrix grounded in existing code and tests;
- explicit failure points and expected fail-closed outcomes;
- identified evidence gaps;
- explicit distinction between proven behavior and unproven behavior;
- the smallest safe Design boundary, if a gap remains.

If any required property is unproven, V4 production authority remains INACTIVE / BLOCKED.

## 6. Operator Acceptance

The operator must remain able to understand lifecycle state, failure, recovery state, and STOP/FAIL-CLOSED conditions using only repository-defined behavior.

No new command, recovery procedure, or authority path may be invented during Contract or Analysis.

## 7. Surveillance

Surveillance remains:

- derived;
- evidence-linked;
- versioned;
- non-authoritative.

It must not mutate raw/canonical evidence, advance the cursor, create authority, perform automated action/trading, or infer actor ownership from address alone. ADDRESS != ACTOR. Temporal leakage remains prohibited.

## 8. Acceptance Criteria

- Contract is committed on a dedicated STEP 606 branch.
- Contract is reviewed and passes required CI.
- No production semantic changes occur.
- No V4 activation occurs.
- Historical evidence, frozen contracts, golden vectors, tests, and valid implementations remain preserved.
- PROJECT_STATE records STEP 606 Contract without claiming later phases are complete.
- The next authorized phase is STEP 606 Analysis.

## 9. Required Sequence

After Contract merge:

**Analysis → Design → Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation → Documentation → Next STEP.**

Failure handling:

**root cause → minimal fix → test → verify → continue.**

## 10. Completion Boundary

STEP 606 Contract is complete only after Contract acceptance, CI, review, merge, post-merge verification, reconciliation, and documentation are evidenced.

This Contract does not authorize production activation.
