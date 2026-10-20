# F-02B — Reorg Runtime Verification Spec v0.1

Status: DRAFT — VERIFICATION BOUNDARY

## Purpose

Prove, offline and deterministically, that a blockchain reorganization preserves authoritative historical evidence while representing superseded evidence as ORPHANED and accepting replacement evidence without silent deletion or cursor reset.

## Scope

In scope for this boundary:
- deterministic reorg fixture
- historical evidence identity preservation
- replacement evidence identity isolation
- explicit expected orphan/replacement sets
- executable negative tests for preservation loss and identity reuse

Deferred to subsequent verification work:
- executable CANONICAL -> ORPHANED transition records
- transition predecessor linkage
- sequence-gap detection
- conflicting duplicate transition detection
- restart/recovery assertions
- byte-level payload immutability verification
- production cursor behavior

Out of scope:
- production RPC
- production evidence
- production cursor mutation
- SQLite migration
- V4 production cutover
- trading or signing

## Deterministic scenario

Original chain:
B100 -> B101 -> B102

Original evidence:
E100 -> E101 -> E102

After reorganization, B101 and B102 are replaced:
B100 -> B201 -> B202

Replacement evidence:
E201 -> E202

## Required result for this boundary

- All original evidence identities remain represented in the preservation set.
- Superseded evidence identities remain distinct from replacement identities.
- Expected orphaned identities must belong to the original evidence set.
- Expected replacement identities must belong to the replacement set and not to the original set.
- Historical evidence is never represented as deleted by the fixture.
- The verifier produces a deterministic result from fixture input only.

## Failure cases covered by this boundary

The verifier rejects:
- incomplete or unknown historical preservation identities
- duplicate original evidence identities
- duplicate replacement evidence identities
- replacement evidence reusing a historical evidence identity
- orphaned identity missing from original evidence
- replacement identity missing from replacement evidence

The deferred transition/recovery cases above remain open and are not claimed as proven by F-02B v0.1.

## Acceptance criteria

A fixture passes this boundary only when the executable verifier and negative tests establish the identity-preservation and replacement-isolation invariants above without RPC access or production state.

F-02B does not close Design Gate 2.
