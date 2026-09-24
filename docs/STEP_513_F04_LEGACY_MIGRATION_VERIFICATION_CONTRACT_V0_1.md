# STEP 513 — F-04 Legacy Migration Verification Contract v0.1

Status: CONTRACT — PENDING VERIFICATION

## Purpose

Define the evidence boundary required to close F-04 (Legacy Migration) without activating V4 production authority or fabricating provenance.

## Required invariants

1. Legacy source bytes remain immutable and addressable.
2. Source identity includes deterministic source digest and migration identity.
3. Byte accounting is deterministic: every migrated source unit is accounted for exactly once, or explicitly classified as preserved/unmigrated/rejected.
4. Migration disposition is explicit and deterministic; no silent normalization or deletion.
5. Migrated records retain source provenance and deterministic linkage to their migration identity.
6. A migration manifest binds source identity, source digest, accounting, dispositions, and resulting artifact identities.
7. Re-running the same migration input is deterministic and idempotent where the disposition permits replay.
8. Same identity with different content/digest is an integrity conflict, not a duplicate.
9. Missing, malformed, incomplete, conflicting, or ambiguous migration evidence fails closed.
10. Migration verification must not manufacture historical provenance that is absent from the source.
11. H-01 LEGACY_FROZEN remains authoritative.
12. H-02 duplicate/collision semantics remain authoritative.
13. H-03 writer fencing remains authoritative.
14. H-04 durability ordering remains authoritative.
15. Historical evidence remains preserved.

## Scope

This contract covers an offline/deterministic migration verification boundary first. It does not authorize a production migration, V4 authority cutover, schema migration, cursor/checkpoint mutation, or historical rewrite.

## Required evidence model

A verification fixture must contain, at minimum:

- explicit source artifact identity;
- source byte digest;
- source unit inventory;
- deterministic migration identity;
- per-unit disposition;
- resulting artifact identity/digest where applicable;
- source-to-result provenance linkage;
- migration manifest;
- expected accounting totals;
- expected deterministic verification result.

## Negative requirements

Verification MUST fail closed for:

- source digest mismatch;
- missing source unit;
- duplicate source identity with conflicting bytes;
- unexplained byte/accounting remainder;
- missing disposition;
- ambiguous disposition;
- result digest mismatch;
- broken source-to-result linkage;
- malformed manifest;
- non-deterministic replay;
- synthetic provenance;
- attempted mutation of preserved source evidence.

## Acceptance

Positive:
- complete fixture verifies deterministically;
- exact source digest and accounting agree;
- all dispositions are explicit;
- provenance linkage is complete;
- replay produces the same verification result without mutating source evidence.

Negative:
- each listed failure class is rejected deterministically;
- rejection produces no partial migration authority;
- conflicting identity/content is classified as integrity conflict.

## Independence

The verification boundary MUST be offline and deterministic. It MUST NOT require RPC/network access, production ingestion, production raw stores, production SQLite authority, cursor advancement, checkpoint advancement, or external services.

## Safety constraints

No:
- V4 production activation;
- RPC endpoint change;
- cursor/checkpoint authority change;
- SQLite schema migration;
- historical deletion/rewrite;
- predictive/ranking/trading/signing/publication behavior;
- replacement or weakening of H-01 through H-04;
- silent normalization.

## Implementation sequence

1. Review this contract.
2. Create deterministic migration fixture.
3. Implement independent verifier.
4. Add positive and fail-closed negative tests.
5. Verify deterministic replay and nonmutation.
6. Run repository Tests, Security & Regression, and CodeQL.
7. Merge only after executable evidence is GREEN.
8. Reconcile project state.
9. Re-review Gate 2.

F-04 is not closed by this contract alone.
