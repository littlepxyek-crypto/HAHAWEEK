# HAHAWEEK — V4 Production Authority Store Boundary V0.1

## Status

DESIGN-ONLY. NO PRODUCTION CUTOVER.

This document defines the minimal persisted authority boundary required before F-03 can move from CONDITIONAL to CLOSED.

## Objective

Provide one durable, verifiable chain that production recovery can load without synthesizing authority in memory:

SEGMENTS -> MANIFEST -> CHECKPOINT -> AUTHORITY RECORD -> CURSOR

Legacy `state.json` and legacy `BlockCursor` remain untouched until a separately reviewed cutover.

## Non-negotiable rules

1. No synthetic manifest or checkpoint.
2. No authority derived only from a cursor.
3. No cursor accepted before manifest and checkpoint verification.
4. No silent migration of legacy cursor state.
5. No overwrite of historical authority records.
6. Same identity + same digest is idempotent.
7. Same identity + different digest is an integrity conflict.
8. Raw evidence remains authoritative.
9. Recovery fails closed on any missing, malformed, mismatched, or unverifiable authority artifact.
10. Production V4 remains opt-in until the complete chain is persisted and tested.

## Minimal persisted artifacts

### Manifest

The production store must persist the exact verified manifest identity and generation plus enough integrity metadata to independently establish that all referenced segments verify.

Required conceptual fields:

- manifest_generation
- manifest_hash
- inventory_hash / inventory identity as defined by the manifest contract
- segment verification status
- creation/commit metadata

The exact manifest schema is not invented by this document. It must reuse the already-frozen V4 manifest/segment contract when that contract is available.

### Checkpoint

Required fields:

- checkpoint input: exactly `{generation, manifest_hash}`
- checkpoint_hash
- persisted reference to the verified manifest generation/hash

Checkpoint authority must be validated by the normative checkpoint validator.

### Authority record

The existing V4 authority record remains the durable binding between:

- manifest generation
- manifest hash
- checkpoint input
- checkpoint hash
- cursor input
- cursor hash
- acquisition position validity

The record identity must remain deterministic and historical records must remain append-only.

### Cursor projection

The current cursor table may contain only the latest projection, but it must reference the exact authority record that authorized it.

The historical authority record remains the audit trail.

## Startup recovery sequence

Production startup must perform:

1. Open database.
2. Load latest persisted authority record.
3. Resolve referenced manifest.
4. Verify manifest identity and generation.
5. Verify referenced segment inventory/identities.
6. Recompute and verify checkpoint hash.
7. Validate checkpoint-to-manifest binding.
8. Recompute and verify cursor hash.
9. Validate cursor checkpoint hash and generation bound.
10. Validate acquisition-specific position mapping.
11. Only then construct the V4 cursor adapter.
12. Only then allow ingestion to advance.

Any failure terminates recovery without silently falling back to legacy cursor state.

## Write sequence

For each successful acquisition batch:

1. Acquire evidence.
2. Persist raw evidence inside the same transaction boundary used for the V4 batch.
3. Validate the applicable manifest/segment boundary.
4. Validate checkpoint authority.
5. Construct the next cursor authority record.
6. Validate cursor transition.
7. Persist the new authority record.
8. Update the latest cursor projection.
9. Commit once.

Failure before commit must leave evidence, authority, and cursor unchanged.

## Critical database interaction

The existing production processor calls `database.save()` directly.

This must be reconciled before V4 production activation because the V4 ingestion path uses an explicit SQLite transaction around processing and cursor advancement.

The production integration must not:

- export/replace the SQLite database from inside the transaction;
- commit evidence independently before the authority transaction;
- persist cursor state independently of the authority transaction.

The final implementation must establish one clear durable commit boundary.

## Legacy boundary

Until cutover is separately approved:

- legacy `BlockCursor` remains unchanged;
- legacy `state.json` remains unchanged;
- no automatic conversion is performed;
- V4 startup must not silently adopt legacy cursor state as V4 authority.

If a future migration is required, it must use the separate V4 migration contract and produce explicit provenance records.

## Required tests before F-03 closure

### Startup

- valid persisted chain resumes exactly;
- missing manifest fails closed;
- manifest hash mismatch fails closed;
- checkpoint hash mismatch fails closed;
- cursor checkpoint mismatch fails closed;
- cursor generation ahead of checkpoint fails closed;
- malformed authority record fails closed.

### Write path

- successful batch commits evidence + authority + cursor together;
- processor failure rolls back all three;
- authority failure rolls back all three;
- cursor regression is rejected;
- duplicate authority identity cannot replace history.

### Restart/crash

- clean restart resumes from the authoritative cursor;
- failed transaction leaves no partial evidence/cursor state;
- restart after failure retries the same acquisition position;
- no legacy fallback silently occurs.

## Closure criterion

F-03 may be changed to CLOSED only after the real production `createEngine()` path loads persisted V4 authority and passes the complete startup/write/restart matrix.

Until then this document is a design boundary only.

## Safety

This change must not modify historical evidence, enable live V4 ingestion, alter RPC acquisition, or merge the production integration branch.
