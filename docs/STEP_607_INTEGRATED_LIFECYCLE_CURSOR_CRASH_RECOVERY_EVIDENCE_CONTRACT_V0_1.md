# STEP 607 — Integrated Lifecycle/Cursor Crash-Recovery Evidence Contract v0.1

## Purpose
Establish the next contract boundary after STEP 606 for proving the integrated lifecycle-database/cursor-state failure boundary under crash, restart, reorg/replacement, and writer-fence/concurrency conditions.

## Repository Baseline
- STEP 606 is VERIFIED / RECONCILED / DOCUMENTED.
- V4 production authority remains INACTIVE / BLOCKED.
- Existing lifecycle schema, deterministic lifecycle identity, authority binding, expected-vs-production authority distinction, cursor semantics, writer-fence ownership, raw/canonical evidence, and Surveillance boundary are frozen.

## Scope
This STEP defines evidence requirements for:
1. lifecycle durable -> cursor durable ordering;
2. crash immediately after lifecycle durability and before cursor durability;
3. restart detection and deterministic reconciliation;
4. successful replay/idempotency;
5. reorg replacement predecessor preservation across crash/restart;
6. writer-fence/concurrency behavior across the same boundary;
7. cursor persistence failure after durable lifecycle evidence;
8. Operator Acceptance for detecting, stopping, reconciling, and verifying these states.

## Required Invariants
- No cursor reset.
- No historical rewrite or evidence deletion.
- No silent normalization.
- No second writer/lock.
- No fallback/default authority.
- Lifecycle evidence remains immutable and evidence-first.
- Cursor advances only after authority validation and durable lifecycle establishment.
- Ambiguity, conflict, unverifiable state, or incomplete recovery is FAIL-CLOSED.
- Expected authority and production authority remain distinct.
- ADDRESS != ACTOR.
- Surveillance remains derived, evidence-linked, versioned, and non-authoritative.
- No automated action/trading or new authority is introduced.
- V4 production authority activation is out of scope.

## Evidence Boundary
The implementation must demonstrate, using repository-grounded tests/evidence rather than assumptions, the ordering:
Prepare -> Final Authority Validation -> Lifecycle Durable Commit -> Cursor Durable Advance -> Completion Verification
Physical atomicity across the lifecycle database and cursor state file must not be claimed unless directly proven.

## Crash/Restart Matrix
At minimum, evidence must cover:
- authority rejection before lifecycle durability;
- lifecycle preparation rejection;
- lifecycle durable + cursor durable;
- lifecycle durable + cursor failure;
- process crash after lifecycle durability before cursor durability;
- restart with lifecycle ahead of cursor;
- exact replay/idempotency;
- conflicting lifecycle identity;
- gap/overlap;
- reorg replacement and predecessor;
- crash during reorg;
- writer-fence loss;
- concurrent/repeated reconciliation;
- cursor regression.

## Recovery Semantics
Recovery must be deterministic and fail closed:
- preserve lifecycle evidence;
- inspect exact processing identity/range and authority binding;
- compare lifecycle and cursor state;
- permit only a contractually valid forward completion;
- stop on conflict, ambiguity, missing evidence, or unverifiable state;
- never reset the cursor or delete historical evidence.
No undocumented operator command may be invented.

## Operator Acceptance
An operator must be able to determine from repository-supported behavior:
- whether lifecycle evidence is durable;
- whether cursor state is durable;
- whether the process stopped at an uncertain boundary;
- whether restart reconciliation succeeded;
- when STOP/FAIL-CLOSED applies;
- how successful recovery is verified.

## Surveillance
No Surveillance implementation is authorized by this contract. Any future Surveillance change remains derived, evidence-linked, versioned, non-authoritative, and subject to its own lifecycle.

## Acceptance Criteria
This Contract is accepted only when:
- the integrated crash/restart/reorg/concurrency evidence boundary is explicit;
- frozen technical semantics remain unchanged;
- failure-atomicity is tested rather than inferred;
- Operator Acceptance is repository-grounded;
- Surveillance remains non-authoritative;
- V4 remains INACTIVE / BLOCKED;
- historical evidence is preserved additively.

## Next Authorized Phase
After Contract acceptance: STEP 607 Analysis.