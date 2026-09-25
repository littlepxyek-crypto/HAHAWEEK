# STEP 607 — DESIGN — INTEGRATED LIFECYCLE/CURSOR CRASH-RECOVERY EVIDENCE HARNESS V0.1

## 1. Purpose

Define the smallest repository-grounded design to produce integrated evidence for lifecycle durability, cursor durability, crash/restart recovery, reorg preservation, and writer-fence/concurrency behavior.

This Design does not activate V4 production authority and does not claim physical atomicity across the lifecycle database and cursor state file.

## 2. Repository Baseline

Actual main inspection after STEP 607 Analysis shows:
- `IngestionEngine` orders `processorRange → authorityGate → cursor.advance`.
- `commitPreparedProductionAuthorityLifecycle` persists the lifecycle through database save and readback validation.
- lifecycle persistence and cursor state persistence are separate durable stores.
- `BlockCursor.advance()` persists state before updating its in-memory state and rejects cursor regression.
- STEP 606 reconciliation can complete a durable lifecycle that is ahead of the cursor only after exact range, authority, binding, and contiguous-range validation.
- The existing writer fence remains the ownership boundary.

## 3. Frozen Invariants

The implementation must preserve:
- lifecycle schema and deterministic lifecycle identity/input digest;
- authority binding and expected-vs-production authority distinction;
- cursor semantics and regression protection;
- existing writer-fence ownership;
- raw/canonical evidence and historical lineage;
- reorg predecessor semantics;
- fail-closed behavior;
- no cursor reset;
- no historical rewrite or evidence deletion;
- no silent normalization;
- no second writer/lock;
- no fallback/default authority;
- no automated action/trading;
- no new authority source;
- V4 production authority remains INACTIVE/BLOCKED;
- Surveillance remains derived, evidence-linked, versioned, non-authoritative, with ADDRESS != ACTOR and no temporal leakage.

## 4. Evidence Boundary

The harness shall evidence this logical sequence:

Prepare
→ Final Authority Validation
→ Lifecycle Durable Commit
→ Cursor Durable Advance
→ Completion Verification

The harness must distinguish logical ordering evidence from physical two-store atomicity. It must not label the two stores as one atomic transaction unless directly proven.

## 5. Failure Injection Design

Use deterministic, test-scoped injection points around existing seams rather than production semantic changes:
1. before lifecycle preparation;
2. after authority validation;
3. immediately after lifecycle database durability/readback and before cursor advancement;
4. during cursor persistence;
5. immediately after cursor durability;
6. during restart;
7. during reorg replacement;
8. at writer-fence ownership boundaries.

Injection must be opt-in to tests, deterministic, auditable, and removed from production execution paths unless separately contracted.

## 6. Integrated Crash/Restart Matrix

Required evidence cases:
- authority rejection: cursor unchanged;
- lifecycle preparation rejection: no durable authority claim;
- normal lifecycle + cursor success;
- durable lifecycle followed by cursor persistence failure;
- process interruption after lifecycle durability and before cursor durability;
- restart with lifecycle ahead of cursor;
- exact replay/idempotency;
- conflicting lifecycle identity;
- gap/overlap;
- reorg predecessor preserved across crash/restart;
- crash during reorg replacement;
- writer-fence loss;
- repeated/concurrent reconciliation;
- cursor regression.

Each case must capture before/after durable lifecycle evidence, durable cursor state, processing identity/range, authority/binding, lineage, and final STOP/FAIL-CLOSED or successful reconciliation result.

## 7. Recovery/Reconciliation Semantics

On restart or uncertain boundary:
- preserve existing lifecycle evidence;
- identify lifecycle records by exact processing identity/range;
- validate expected authority, production authority, binding, generation, lineage, and predecessor where applicable;
- compare durable lifecycle range to durable cursor;
- permit only the already-contractual exact forward completion;
- treat missing, conflicting, ambiguous, incomplete, or unverifiable evidence as STOP/FAIL-CLOSED;
- never reset the cursor;
- never delete or rewrite lifecycle evidence.

No undocumented operator recovery command is introduced by this Design.

## 8. Reorg Evidence

For REORG_REPLACEMENT:
- predecessor must remain immutable;
- replacement must retain the existing predecessor linkage;
- crash/restart must preserve both lifecycle records;
- ambiguity or conflict must fail closed;
- no historical deletion or rewrite.

## 9. Concurrency Evidence

Use the existing writer fence as the sole ownership boundary.

Evidence must cover:
- ownership before preparation;
- ownership before durable lifecycle write;
- ownership after lifecycle readback;
- ownership before cursor completion;
- fence loss;
- repeated/concurrent reconciliation attempts.

No second lock or writer is introduced.

## 10. Operator Acceptance

The evidence and repository artifacts must allow an operator to determine, from actual repository-supported behavior:
- whether lifecycle preparation succeeded;
- whether lifecycle durability succeeded;
- whether cursor durability succeeded;
- whether execution stopped at an uncertain boundary;
- whether deterministic reconciliation succeeded;
- when STOP/FAIL-CLOSED is required;
- whether recovery preserved lifecycle evidence and cursor semantics.

Commands/procedures must come only from existing repository interfaces or be separately contracted before implementation.

## 11. Test/Artifact Requirements

Tests must assert durable state, not only return values. Evidence should include deterministic identifiers for:
- lifecycle identity;
- processing identity;
- range;
- cursor before/after;
- authority/binding;
- lineage/predecessor;
- injected failure point;
- recovery outcome.

The harness must prove failure behavior rather than infer it from ordinary success-path tests.

## 12. Production Semantic Boundary

Preferred implementation is test/evidence infrastructure around existing seams. Production semantics remain unchanged unless a subsequent Code phase demonstrates a necessary, contract-authorized correction.

No V4 activation is part of this Design.

## 13. Acceptance Criteria

Design is accepted only when:
1. integrated crash/restart evidence cases are explicitly defined;
2. lifecycle and cursor durability are observed independently;
3. failure injection is deterministic and test-scoped;
4. restart/reconciliation is exercised against actual durable state;
5. reorg predecessor preservation is tested across restart;
6. writer-fence/concurrency behavior is tested without a second lock;
7. cursor reset/evidence deletion/rewrite are prohibited by tests;
8. ambiguity/conflict/incomplete evidence fails closed;
9. Operator Acceptance remains repository-grounded;
10. Surveillance remains derived/evidence-linked/versioned/non-authoritative;
11. V4 remains INACTIVE/BLOCKED;
12. historical evidence and frozen semantics remain unchanged.

## 14. Next Phase

After Design acceptance and its post-merge reconciliation/documentation, the next authorized phase is STEP 607 Code.
