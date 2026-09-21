# STEP 71G — Migration Manifest Reconciliation

Status: REFERENCE-ONLY / BLOCKED FOR NORMATIVE PROMOTION

## Normative migration identity

Migration identity is:

```json
{
  "source_file_sha256": "<64 hex>",
  "source_size_bytes": "0",
  "source_record_count": "0",
  "source_path": "data/raw-events.jsonl",
  "target_chain_id": "4663",
  "protocol_version": "4"
}
```

Its artifact identity uses the MIGRATION domain.

## Normative migration manifest

The migration manifest contains the migration identity result plus accounting fields:

- migration_id
- source_file_sha256
- source_size_bytes
- source_record_count
- verified_count
- unverified_count
- quarantined_count
- verified_output_hash
- unverified_output_hash
- quarantine_output_hash
- created_at
- migration_manifest_hash

The final `migration_manifest_hash` is a self-hash-excluded field: the hash is calculated over the manifest without `migration_manifest_hash`.

## F-01 reconciliation

The existing F-01 vector verifies a deterministic hash over the manifest fields before the self-hash field is added. This is useful reference evidence.

It must not be promoted until the fixture explicitly represents:
1. the exact normative envelope;
2. the exact self-hash exclusion;
3. the three output accounting hashes;
4. deterministic counts;
5. canonical bytes;
6. expected migration_manifest_hash;
7. negative mutation coverage.

## Accounting invariant

For a complete migration disposition:

`verified_count + unverified_count + quarantined_count = source_record_count`

The verifier must validate this invariant rather than trusting the reported counts.

## Decision

Do not copy the F-01 migration-manifest hash into the normative fixture set.

Generate a fresh normative vector after the envelope and self-hash rule are implemented in the reference verifier.

## Gate 2 consequence

This document does not authorize migration, production data mutation, or V4 cutover.
