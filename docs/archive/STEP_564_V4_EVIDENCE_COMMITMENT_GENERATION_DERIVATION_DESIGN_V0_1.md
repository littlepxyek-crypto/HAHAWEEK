# STEP 564 — V4 Evidence Commitment & Generation Derivation Design v0.1

Status: DESIGN
Step: 564
Contract: STEP 563

## API

`deriveV4EvidenceCommitment({ processingResult, evidenceRecords, allowEmptyResult })`

### processingResult

Required:
- `processingResultId`: non-empty immutable identity;
- `fromBlock`, `toBlock`: exact processed range;
- `generation`: existing F-03 generation string;
- `status`: exactly `ACCEPTED_CANONICAL`;
- `canonicalEvidenceIds`: exact ordered-independent membership declaration;
- `emptyResult`: explicit boolean.

The implementation rejects inconsistent range/generation/status/membership.

### evidenceRecords

Each record is the persisted repository representation:
- `evidence_id`, `identity_schema_version`, `identity_hash`, `raw_event_id`, `raw_hash`, `canonical_hash`;
- `canonical`;
- `raw`.

The module recomputes raw/canonical hashes and identity from the supplied immutable records and rejects mismatches.

## Deterministic algorithm

1. Validate processing result and exact range.
2. Validate generation through the existing F-03 validator.
3. Validate explicit canonical-result acceptance and evidence membership.
4. Reject empty evidence unless `emptyResult === true` and `allowEmptyResult === true`.
5. Validate each persisted raw/canonical linkage and identity.
6. Sort by block, transaction index, log index, raw event ID, evidence ID.
7. Reject duplicate authority keys.
8. Construct only the contract-frozen leaf fields.
9. Hash leaf using `HAHAWEEK-EVIDENCE-V4-SEGMENT-LEAF` + JCS.
10. Construct segment payload and hash with the frozen segment domain.
11. Construct deterministic segment identity.
12. Construct manifest payload and hash with the frozen manifest domain.
13. Construct deterministic manifest identity.
14. Reuse `checkpointDigestFor(generation, manifestDigest)`.
15. Return immutable commitment material and provenance-ready processing identity/count.

No runtime cursor, writer-fence value, timestamp, random UUID, or expected-authority value enters commitment derivation.

## Fail-closed invariants

Any mismatch throws before returning a candidate. The module performs no database write and no cursor mutation.
