# STEP 566 — Durable Processing-Result / Generation Persistence Design v0.1

## Logical design

canonical processing → processing execution identity → validate exact canonical evidence set → create immutable processing result → persist ordered evidence membership atomically → expose immutable context → STEP 564 commitment derivation → submitted authority boundary

## Minimal persistence objects

### processing_results

One immutable row per accepted processing result.

Identity and lineage: result_id, processing_execution_id, parent_result_id, transition_type.

Authority context: from_block, to_block, generation, status, canonicality_status, empty_result, evidence_set_digest.

Provenance: committed_at, provenance.

### processing_result_evidence

Immutable ordered membership rows.

Key: (result_id, ordinal)

Content: evidence_id, raw_event_id, identity_hash, raw_hash, canonical_hash, block_number, transaction_index, log_index.

## Determinism

Membership rows are persisted in the exact STEP 563 deterministic order. The context reader returns the same byte-equivalent logical representation for the same committed result.

## Reorg

Old result rows remain immutable. A replacement points to the prior result and receives an explicitly supplied new generation.

## Migration

Schema migration is intentionally deferred to the implementation contract after this semantic boundary is reviewed and CI-verified.
