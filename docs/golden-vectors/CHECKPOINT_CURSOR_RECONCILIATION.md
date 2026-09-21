# STEP 71E — Checkpoint / Cursor Reconciliation

Status: REFERENCE-ONLY / BLOCKED FOR NORMATIVE PROMOTION

## Frozen normative checkpoint identity

The normative protocol defines the checkpoint identity as:

```json
{
  "chain_id": "4663",
  "manifest_generation": "0",
  "manifest_hash": "<64 hex>",
  "evidence_to_block": "64986566",
  "last_segment_sequence": "0",
  "last_record_sequence": "229"
}
```

The existing F-01 reference vector uses the same logical fields but represents `manifest_hash` with a `0x` prefix. That representation must not be silently promoted.

## Frozen normative cursor envelope

The normative protocol defines the cursor record as:

```json
{
  "record_type": "CURSOR",
  "protocol_version": "4",
  "chain_id": "4663",
  "checkpoint_generation": "0",
  "checkpoint_hash": "<64 hex>",
  "next_block": "64986567",
  "updated_at": "2026-09-19T00:00:00.000Z"
}
```

The existing F-01 cursor vector is a different identity model using `manifest_generation`, `checkpoint_id`, `cursor_generation`, and `last_record_sequence`. It therefore remains reference evidence only.

## Decision

Do not copy the F-01 checkpoint/cursor hashes into normative fixtures.

The next fixture-generation step must construct fresh vectors from the frozen normative schemas, then independently compute canonical bytes and hashes.

## Gate 2

This closes neither checkpoint nor cursor verification. It closes the ambiguity about which schema is authoritative.
