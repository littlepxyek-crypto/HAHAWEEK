# F-04A Legacy Migration Reference Boundary

Status: DRAFT / TEST-ONLY

## Purpose

Define a deterministic, provider-independent reference boundary for legacy migration without modifying production evidence or synthesizing provenance.

## Canonical migration input

A migration input contains exactly:

- protocol
- version
- source_digest
- source_byte_length
- source_record_count
- disposition_digest

All numeric counts are non-negative decimal strings.

## Source digest

The source digest is SHA-256 over the exact legacy byte sequence supplied to the migration boundary. No parsing, whitespace normalization, field sorting, newline conversion, or encoding conversion is permitted before source hashing.

## Disposition

Every source record receives one explicit disposition:

- PRESERVE — retained as legacy evidence without V4 reinterpretation.
- MIGRATE — mapped to a V4 representation with explicit source linkage.
- QUARANTINE — retained but excluded from authoritative V4 data.
- REJECT — retained in the migration audit record and excluded from V4 authority.

Unknown or ambiguous provenance must not be converted into MIGRATE.

## Migration identity

Migration identity is derived deterministically from the canonical migration input. It is not based on timestamps, runtime process IDs, filesystem paths, or random values.

## Migration manifest

A manifest records:

- source digest
- source byte length
- source record count
- disposition digest
- migration identity
- protocol/version

The manifest is verification material, not permission to mutate the source.

## Safety rules

1. Legacy source remains preserved.
2. Migration is append-only at the audit boundary.
3. Failed verification does not modify source state.
4. No synthetic provenance.
5. No silent record deletion.
6. No legacy cursor hash may be invented.
7. Migration must be reproducible from the same source bytes and disposition set.
8. V4 authority must not be activated merely because migration completed.

## Non-goals

This document does not authorize production migration, V4 cutover, legacy write freeze, or deletion of legacy storage.
