# Authoritative Evidence Envelope Contract v0.1

Status: VERIFIED / FROZEN
Step: 441
Scope: preserved raw RPC evidence boundary for historical replay

## Purpose

Define the minimum immutable envelope required before preserved blockchain RPC data may enter the AUTHORITATIVE replay boundary.

This contract does not perform live backfill, change ingestion, advance the cursor, activate V4, introduce predictive scoring, or introduce trading.

## Required provenance

An authoritative evidence envelope MUST contain:

- `schema_version`
- `evidence_class: AUTHORITATIVE`
- `chain_id`
- `source` / provider identity
- `evidence_id`
- `request.method`
- `request.params`
- `response_payload` containing the preserved raw RPC response
- `observation.block_number`
- `capture.captured_at`
- `events` derived from the preserved response for replay

The preserved `response_payload` is evidence input. Derived events are replay input and MUST remain distinguishable from the preserved raw payload.

## Authority rules

The envelope constructor MUST:

- accept only explicitly supplied AUTHORITATIVE capture input;
- preserve the supplied raw response without normalization;
- preserve request method and parameters;
- preserve observation context;
- produce a distinct envelope object without mutating its input;
- never access or mutate cursor, runtime state, raw-store authority, or V4 authority.

It MUST NOT:

- promote SYNTHETIC or DISCOVERY_ONLY data;
- manufacture blockchain observations;
- infer missing provenance;
- silently normalize or rewrite raw response data.

## Determinism

For identical capture input, the envelope contents MUST be identical except for explicitly supplied capture metadata. `evidence_id` is supplied by the caller and is not generated from processing time.

## Boundary

AUTHORITATIVE RAW RPC CAPTURE
→ AUTHORITATIVE EVIDENCE ENVELOPE
→ REPLAY ADAPTER
→ FORMATION ENGINE

The envelope is a provenance boundary, not a production authority migration.

## Non-goals

- no live historical backfill;
- no RPC ingestion redesign;
- no cursor changes;
- no raw-store migration;
- no V4 production activation;
- no predictive scoring;
- no trading.

Design Gate 2 remains OPEN.
Production V4 remains NOT AUTHORIZED.
