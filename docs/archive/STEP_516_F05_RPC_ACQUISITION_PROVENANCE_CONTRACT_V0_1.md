# STEP 516 — F-05 RPC Acquisition Provenance Contract v0.1

Status: CONTRACT — PENDING VERIFICATION

## Purpose

Define the evidence required to close F-05: RPC acquisition provenance. The boundary must prove that acquired blockchain data can be tied deterministically to provider, chain, request/page identity, response normalization, and independent block/receipt cross-checks where applicable.

## Required invariants

1. Every acquisition artifact has an explicit acquisition identity.
2. Provider identity, endpoint identity, chain identity, request parameters, and acquisition timestamp/context are explicit.
3. Raw response material is preserved or represented by a deterministic digest sufficient to verify the supplied artifact.
4. Normalization is deterministic and does not silently discard material fields.
5. Page/chunk boundaries are explicit and reproducible.
6. Block/log/receipt linkage is explicit where the acquisition type supports it.
7. Cross-check mismatches fail closed.
8. Same acquisition identity + same digest is replay-safe; same identity + different digest is INTEGRITY_CONFLICT.
9. Missing provider/chain/request/response provenance fails closed.
10. Network/provider failures remain observable and cannot be converted into valid evidence.
11. No verifier may infer provenance that was not supplied.
12. H-01 through H-04 remain authoritative.
13. Historical evidence remains unchanged.

## Scope

First implementation is an offline deterministic verification boundary using supplied acquisition fixtures. It does not change live RPC ingestion, provider selection, cursor/checkpoint authority, database schema, or production evidence.

## Required fixture classes

At minimum:
- successful acquisition with explicit provider and chain identity;
- deterministic request/page identity;
- preserved response digest;
- normalized artifact and normalization rules;
- block/log linkage;
- receipt/block cross-check where supported;
- repeated identical acquisition;
- provider/network failure;
- response mismatch;
- chain/provider mismatch;
- incomplete provenance;
- conflicting acquisition identity/digest.

## Acceptance

Positive:
- complete acquisition artifact verifies;
- normalization is deterministic;
- provenance linkage is complete;
- block/log/receipt relationships agree;
- deterministic replay returns identical verification digest.

Negative:
- malformed/missing provenance fails closed;
- provider/chain mismatch fails;
- response digest mismatch fails;
- cross-check mismatch fails;
- same identity/different digest is integrity conflict;
- failure response cannot become valid acquisition evidence.

## Independence

Offline and deterministic. No live RPC/network, production ingestion, SQLite authority, cursor/checkpoint mutation, or external service.

## Safety

No V4 production activation, RPC endpoint change, schema migration, cursor/checkpoint semantic change, historical rewrite/deletion, predictive/ranking/trading/signing/publication behavior.

## Sequence

Contract → fixture → independent verifier → positive/negative tests → deterministic replay/nonmutation → Tests/Security/CodeQL → merge → exact post-merge verification → reconciliation → Gate 2 re-review.

F-05 is not closed by this contract alone.
