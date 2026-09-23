# STEP 500 — H-02 Duplicate / Collision Isolation Contract v0.1

Status: CONTRACT — PENDING VERIFICATION

## Purpose

Define the exact integrity boundary for duplicate and collision handling before any H-02 implementation changes are introduced.

H-02 closes the ambiguity between an idempotent replay and an integrity conflict:

- same identity + same digest = IDEMPOTENT
- same identity + different digest = INTEGRITY_CONFLICT

Legacy `INSERT OR IGNORE` behavior must not be allowed to define V4 integrity semantics.

## Boundary

After this contract is implemented and verified:

1. Every covered integrity identity must be evaluated together with its authoritative digest before a duplicate is classified as idempotent.
2. An existing record with the same identity and identical authoritative digest is idempotent and must not create a second record.
3. An existing record with the same identity and a different authoritative digest is an integrity conflict and must fail closed.
4. A database-level duplicate suppression mechanism such as `INSERT OR IGNORE` may remain an implementation detail only where it cannot silently convert a digest mismatch into success.
5. A collision must never be silently discarded, normalized, overwritten, merged, or reclassified as an ordinary duplicate.
6. Conflict classification must not advance cursor/checkpoint authority or mutate unrelated evidence.
7. Read-only verification remains available regardless of active/frozen legacy write state, subject to existing H-01 boundaries.
8. Historical evidence remains immutable.
9. No V4 production authority activation is part of this step.

## Covered identity classes

The implementation must explicitly identify the existing legacy write paths whose duplicate semantics can affect evidence integrity, including:

- raw event identity;
- canonical/evidence identity where an identity-to-digest relationship is enforced;
- any additional repository/store identity that currently relies on silent duplicate suppression.

The implementation must not invent a new identity scheme. Existing project identity definitions remain authoritative unless a separate reviewed contract is created.

## Required evidence

### Positive

- First insertion of a valid identity/digest pair succeeds while the existing write boundary permits it.
- Repeating the same identity with the same digest returns an explicit idempotent result or equivalent deterministic no-op.
- Repeated idempotent processing does not create additional records.
- Existing read/query behavior remains unchanged.
- Existing unrelated records remain unchanged.

### Negative

- Same identity with a different digest fails explicitly as `INTEGRITY_CONFLICT` or the repository's approved equivalent.
- Legacy `INSERT OR IGNORE` cannot turn that mismatch into a successful no-op.
- A conflict does not overwrite the original record.
- A conflict does not create a second authoritative record.
- A conflict does not advance cursor/checkpoint state.
- A conflict does not mutate unrelated evidence.
- Malformed or missing digest material fails closed where the covered path requires a digest.
- Competing historical records are not merged merely because their storage identity collides.
- Repeated conflict attempts remain deterministic.

## Determinism requirements

For the same initial state and identical input sequence:

- the resulting record set must be identical;
- the idempotent classification must be identical;
- the conflict classification must be identical;
- no hidden timestamp, insertion order, or database-specific duplicate behavior may change the semantic classification.

If the implementation exposes a structured result, its semantic fields must be stable enough for regression testing.

## Non-goals

- No V4 authority activation or cutover.
- No new V4 transition semantics.
- No SQLite schema migration unless a separate reviewed contract explicitly authorizes it.
- No RPC changes.
- No cursor reset.
- No checkpoint authority change.
- No historical deletion, rewriting, or synthetic provenance.
- No change to canonicalization or hashing rules.
- No predictive/ranking/trading/signing/publication behavior.
- No vendor-specific integrity semantics.
- No silent normalization.

## Acceptance

H-02 may be declared VERIFIED only after:

1. this contract is merged before implementation;
2. all covered duplicate/collision write paths are enumerated;
3. implementation tests prove same-identity/same-digest idempotency;
4. implementation tests prove same-identity/different-digest conflict;
5. legacy `INSERT OR IGNORE` cannot hide a digest mismatch;
6. negative tests prove no mutation, cursor/checkpoint advancement, or overwrite on conflict;
7. full HAHAWEEK Tests and Security & Regression pass;
8. CodeQL passes;
9. the exact implementation merge commit has successful post-merge verification;
10. a subsequent state-reconciliation step records the evidence without deleting prior history.

## Safety boundary

This contract is documentation and test-authority preparation only. It must not alter production evidence, cursor state, checkpoint authority, RPC acquisition, or V4 production authority.

Any semantic change outside this boundary requires a new explicit contract/step.

## Sequence

Contract → review/CI → merge → implementation → tests → security/CodeQL → exact post-merge verification → state reconciliation.

Design Gate 2 remains NOT PASSED until all required controls are independently verified.
