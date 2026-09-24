# STEP 514 — F-04 Independent Migration Verifier v0.1

Status: IMPLEMENTATION — PENDING VERIFICATION

This verifier is an offline, deterministic audit boundary. It does not perform migration and does not mutate production state.

## Contract boundary

The verifier accepts a migration scenario containing:
- immutable source artifacts with explicit IDs, byte counts, and SHA-256 digests;
- source units with deterministic identity and source artifact linkage;
- explicit dispositions;
- resulting artifact identities/digests where applicable;
- source-to-result provenance;
- migration manifest with deterministic accounting.

It returns VERIFIED only when all identities, digests, accounting, dispositions, provenance links, manifest totals, and deterministic replay agree.

## Fail-closed rules

Reject:
- source digest mismatch;
- source-unit digest mismatch;
- missing/unknown source artifact;
- duplicate source identity with conflicting digest;
- missing or ambiguous disposition;
- missing result artifact or result digest mismatch;
- broken source-to-result linkage;
- accounting mismatch;
- malformed manifest;
- provenance pointing to an undeclared source;
- non-deterministic replay.

Same identity + same digest is replay-safe; same identity + different digest is INTEGRITY_CONFLICT.

## Safety

No RPC/network, production ingestion, production SQLite authority, cursor/checkpoint advancement, schema migration, historical rewrite/deletion, V4 activation, predictive/ranking/trading/signing/publication.

The implementation uses only local deterministic SHA-256 and fixture data.
