# HAHAWEEK — SOCIAL SNAPSHOT PROVENANCE CONTRACT v1

Status: IMPLEMENTED / CI VERIFICATION REQUIRED

## Purpose

A social snapshot is an acquired observation of externally published content or a HAHAWEEK publication artifact. It preserves enough provenance to reconstruct what was observed, from where, and under which acquisition context.

Social data is not canonical truth and does not mutate V4 evidence authority.

## Required fields

Every snapshot MUST contain:

- snapshot_id
- content_id
- source_id
- source_type
- acquisition_id
- publisher
- captured_at
- first_seen
- digest
- derivation_method
- temporal_scope
- origin_kind

`origin_kind` MUST be one of:
- EXTERNAL
- HAHAWEEK_PUBLICATION

`digest` is the digest of the observed content representation and MUST be a non-empty string.

## Provenance

The snapshot MUST preserve source identity/type, optional parent source lineage, acquisition identity, publisher, first-seen time, capture time, content identity, snapshot identity, derivation method, temporal scope, and origin kind.

The same content observed through a mirror, repost, aggregator, or HAHAWEEK publication MUST retain its lineage. Source count MUST NOT be treated as source independence.

## Publication lineage

When `origin_kind` is `HAHAWEEK_PUBLICATION`, the snapshot is publication-derived and MUST NOT automatically qualify as an independent external source.

A later observation of HAHAWEEK-generated content therefore retains explicit publication lineage rather than being promoted to independent evidence.

## Authority boundary

This contract is an acquisition/provenance boundary. It MUST NOT:
- rewrite raw evidence;
- mutate canonical evidence;
- mutate V4 identity or transitions;
- advance the V4 cursor;
- mutate checkpoint or manifest;
- establish canonicality;
- activate production authority;
- promote a social claim to authoritative evidence.

## Determinism

For identical canonical snapshot input and contract version, the snapshot identity MUST be deterministic.

## Temporal semantics

`first_seen`, `captured_at`, and `temporal_scope` are preserved separately. They MUST NOT be silently collapsed into a single event timestamp.

## Acceptance

CONTRACT → IMPLEMENTATION → POSITIVE TEST → NEGATIVE TEST → RUNTIME VERIFICATION → DOCUMENTATION → RECONCILIATION

Social ingestion itself is outside this contract and remains inactive until its acquisition contract is separately authorized.