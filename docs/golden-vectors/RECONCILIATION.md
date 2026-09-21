# V4 Golden Vector Reconciliation

Status: REFERENCE-ONLY / NOT GATE-2 PASS

This document records the reconciliation boundary before F-01 test vectors are promoted into normative golden-vector fixtures.

## Confirmed reference families

- EVENT_IDENTITY
- TRANSITION_IDENTITY
- REORG_OBSERVATION
- ACQUISITION_IDENTITY
- MANIFEST
- LEASE
- MIGRATION
- BACKUP

These have executable F-01 reference vectors and deterministic expected hashes.

## Requires normative reconciliation

- SEGMENT: F-01 seal test uses `0x`-prefixed segment_id/body_sha256 values; the normative protocol examples define hash fields as exact protocol values and must be reconciled before promotion.
- CHECKPOINT: F-01 identity uses `manifest_generation`, `manifest_hash`, `evidence_to_block`, `last_segment_sequence`, `last_record_sequence`; the frozen normative checkpoint identity must be compared field-for-field before promotion.
- CURSOR: F-01 identity uses `manifest_generation`, `checkpoint_id`, `cursor_generation`, `next_block`, `last_record_sequence`; the frozen normative cursor envelope/identity must be reconciled before promotion.
- MIGRATION_MANIFEST: F-01 vector is a hash test over the manifest body; the normative self-hash exclusion and exact envelope must be reconciled before promotion.

## Canonicalization boundary

The current F-01 implementation is a reference JCS-like serializer. It is not yet sufficient evidence of full RFC 8785 conformance. No fixture in this branch may claim production RFC 8785 authority until conformance is independently verified.

## Rule

Do not silently copy a passing test vector into a normative fixture when its field model or hash encoding differs from the frozen protocol. Reconcile first, then generate the canonical fixture and golden bytes.

## Gate 2 consequence

This reconciliation artifact does not close Gate 2. It prevents false closure and defines the exact boundary for the next fixture-generation step.
