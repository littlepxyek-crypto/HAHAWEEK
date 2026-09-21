# STEP 71F — Segment Reconciliation

Status: REFERENCE-ONLY / BLOCKED FOR NORMATIVE PROMOTION

## Frozen segment identity

The normative segment identity is:

```json
{
  "protocol_version": "4",
  "segment_kind": "EVENT",
  "generation": "0",
  "segment_sequence": "0"
}
```

Its identity is computed with the SEGMENT domain.

## Body boundary

The segment body is:

`JCS(record_1) LF ... JCS(record_N) LF`

The SEGMENT domain separator is prepended with one NUL byte before SHA-256.

The segment header and segment seal are excluded from body_sha256.

## Seal identity

The normative seal identity contains:

```json
{
  "segment_id": "<64 hex>",
  "generation": "0",
  "segment_sequence": "0",
  "segment_kind": "EVENT",
  "first_body_sequence": "1",
  "last_body_sequence": "N",
  "record_count": "N",
  "body_sha256": "<64 hex>"
}
```

The existing F-01 reference test constructs `segment_id` and `body_sha256` with a `0x` prefix. Those values must not be promoted until the exact normative hash grammar is reconciled.

## Reconciliation result

The F-01 segment body hash is useful executable reference evidence, but it is not yet a normative fixture.

The next implementation must generate a fresh segment vector from the frozen protocol and record:
- exact JCS body bytes;
- body_sha256;
- segment identity preimage;
- segment_id;
- seal identity preimage;
- segment_hash;
- deterministic negative mutations for body bytes, segment sequence, and seal body hash.

## Gate 2 consequence

No production segment writer, manifest update, or cursor authority is changed by this document.
