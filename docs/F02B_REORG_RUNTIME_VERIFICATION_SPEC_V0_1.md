# F-02B — Reorg Runtime Verification Spec v0.1

Status: DRAFT — VERIFICATION BOUNDARY

## Purpose

Prove, offline and deterministically, that a blockchain reorganization preserves authoritative historical evidence while representing superseded evidence as ORPHANED and accepting replacement evidence without silent deletion or cursor reset.

## Scope

In scope:
- deterministic reorg fixture
- evidence preservation
- CANONICAL -> ORPHANED transition
- replacement evidence
- transition linkage
- restart/recovery assertions

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

Required result:
- E101 and E102 remain present and byte-identical to their original payloads.
- E101 and E102 transition from CANONICAL to ORPHANED.
- E201 and E202 have distinct authoritative evidence identities.
- E201 and E202 may become CANONICAL through valid transition chains.
- No historical evidence is deleted.
- No cursor is silently reset.

## Failure cases

The verifier must reject:
- deleted historical evidence
- mutated historical payload
- invalid ORPHANED transition
- replacement evidence reusing an old evidence identity
- broken transition predecessor linkage
- sequence gaps
- conflicting duplicate transitions
- nondeterministic output

## Acceptance criteria

A fixture passes only when all invariants above are independently verifiable without RPC access or production state.

F-02B does not close Design Gate 2.
