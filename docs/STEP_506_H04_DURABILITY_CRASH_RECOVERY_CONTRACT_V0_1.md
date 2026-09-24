# HAHAWEEK — STEP 506 H-04 Durability / Crash Recovery Contract v0.1

**Status:** CONTRACT — PENDING VERIFICATION

## 1. Purpose

Define the engineering boundary for H-04 — Durability / Crash Recovery.

The objective is to prove that committed evidence remains durable across interruption and that cursor/checkpoint authority cannot outrun the evidence that was durably committed.

H-04 does not activate V4 production authority.

## 2. Required invariants

1. Evidence persistence must precede any cursor/checkpoint advancement that claims the evidence as committed.
2. A crash before evidence commit must not produce a durable cursor/checkpoint claiming that evidence.
3. A crash after evidence commit but before cursor advancement must permit deterministic replay without data loss.
4. Restart must recover from the last durable authority boundary.
5. Recovery must not silently skip, rewrite, duplicate-with-different-digest, or manufacture evidence.
6. Same identity + same digest remains idempotent under recovery; same identity + different digest remains an integrity conflict.
7. H-01 LEGACY_FROZEN remains authoritative.
8. H-03 writer fencing remains authoritative; a stale writer cannot resume mutation after restart.
9. Historical evidence remains unchanged.
10. Recovery behavior must be deterministic and testable offline.

## 3. Scope

H-04 covers durability ordering and crash/restart behavior at the existing legacy evidence/cursor boundary.

The implementation must explicitly model:

acquire writer → process/acquire evidence → durable evidence commit → cursor/checkpoint advancement → durable authority

The exact implementation may use existing persistence mechanisms but must not rely on process memory as the source of committed authority.

No SQLite schema migration is permitted by this contract.

## 4. Failure points

Executable tests must cover interruption at minimum:

- before evidence mutation;
- during evidence mutation;
- after evidence mutation but before persistence;
- after evidence persistence but before cursor advancement;
- after cursor advancement;
- during restart;
- stale writer restart;
- malformed persistence state;
- duplicate replay;
- conflicting replay.

Where the underlying persistence primitive is atomic, the test must verify the externally observable durable states rather than simulate impossible partial bytes.

## 5. Recovery invariants

For persisted prefix N:

- restart resumes only from the durable authority boundary;
- committed evidence through N remains intact;
- uncommitted work is replayable;
- cursor never claims evidence beyond the durable committed boundary;
- replay produces the same identity/digest classification;
- recovery does not mutate historical committed records.

## 6. Acceptance cases

### Positive

1. Evidence is persisted before authority advances.
2. Restart after evidence commit recovers without loss.
3. Restart before authority advancement replays deterministically.
4. Idempotent replay produces no conflicting duplicate.
5. A valid current H-03 writer can recover and continue.
6. Read-only inspection remains available.

### Negative

1. Cursor cannot advance when evidence persistence fails.
2. Cursor cannot outrun durable evidence.
3. A crash cannot manufacture committed evidence.
4. Stale writer cannot recover mutation authority.
5. Malformed state fails closed.
6. Conflicting replay cannot be treated as idempotent.
7. H-01 frozen state cannot be bypassed during recovery.
8. Recovery cannot reset cursor authority as a shortcut.

## 7. Required test matrix

- fail-before-commit;
- fail-after-commit-before-cursor;
- fail-after-cursor;
- restart from durable prefix;
- repeated restart;
- stale writer after restart;
- malformed state;
- duplicate same-digest replay;
- duplicate different-digest replay;
- deterministic repeated recovery;
- persistent-state nonmutation on rejected recovery.

Tests must assert both classification/error and durable state.

## 8. Interaction with existing controls

H-04 is subordinate to H-01 LEGACY_FROZEN, H-02 identity/digest conflict semantics, and H-03 single-writer/fencing authority.

Recovery cannot weaken or bypass these controls.

## 9. Safety constraints

This step MUST NOT:

- activate V4 production authority;
- change RPC endpoints;
- change acquisition semantics;
- reset cursor/checkpoint authority;
- perform a SQLite schema migration;
- rewrite or delete historical evidence;
- silently normalize conflicts;
- introduce predictive/ranking/trading/signing/publication behavior;
- merge stale implementation branches;
- replace H-01, H-02, or H-03 semantics.

## 10. Required implementation sequence

1. Contract review.
2. Durability reference model.
3. Failure-injection harness.
4. Implementation, only where required.
5. Crash/restart tests.
6. H-01/H-02/H-03 compatibility tests.
7. Full HAHAWEEK Tests.
8. Security & Regression.
9. CodeQL.
10. PR merge.
11. Exact merge-commit post-merge verification.
12. State reconciliation.
13. Only then evaluate H-05.

## 11. Closure condition

H-04 may be declared VERIFIED/FROZEN only when executable evidence demonstrates durable evidence-before-authority ordering, crash recovery, cursor non-overrun, deterministic replay, duplicate/conflict preservation, stale-writer rejection, malformed-state fail-closed behavior, and compatibility with H-01/H-02/H-03.

Until then:

**H-04 remains CONDITIONAL / NOT CLOSED.**

## 12. Independence and preservation

This contract preserves all historical project-state entries.

No existing evidence is migrated, rewritten, deleted, or reinterpreted by the contract itself.

Any future H-04 semantic change requires a new explicit contract/step.
