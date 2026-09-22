# Authoritative Evidence Fixture Contract v0.1

Status: VERIFIED / FROZEN

## Purpose

Define deterministic, preserved-input fixtures for testing the frozen AUTHORITATIVE evidence envelope and replay boundary without claiming that the fixtures are live blockchain captures.

## Fixture classes

These fixtures are explicitly AUTHORITATIVE **test inputs** only. They are not claims of live blockchain observation. A production-authoritative capture must originate from preserved raw RPC evidence with real provenance.

Required metadata:
- schema_version
- fixture_class
- chain_id
- formation_type
- fixture_id
- evidence_id
- source
- request.method
- request.params
- response_payload
- observation.block_number
- capture.captured_at
- events

## Authority boundary

Fixture replay MUST:
- pass through the frozen authoritative evidence envelope;
- pass through the frozen authoritative replay adapter;
- feed the frozen POOL_BOOTSTRAP Formation Contract;
- remain offline and deterministic;
- never advance or reset the production cursor;
- never mutate production runtime state;
- never overwrite production raw evidence;
- never activate V4 authority.

Fixture replay MUST NOT:
- be presented as live blockchain evidence;
- manufacture missing provenance;
- normalize or rewrite the preserved response payload;
- infer authority from fixture naming alone.

## Required vectors

At minimum:
1. valid Pool Bootstrap;
2. incomplete Pool Bootstrap;
3. temporally invalid Pool Bootstrap;
4. deterministic replay identity.

## Non-goals

No live backfill, RPC ingestion redesign, cursor change, raw-store migration, V4 production activation, predictive scoring, trading, or signing.
