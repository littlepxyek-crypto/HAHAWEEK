# HAHAWEEK — V4 Checkpoint Authority Boundary V0.1

## Purpose

Provide an isolated, pure authority boundary between V4 evidence commitments and cursor advancement.

## Authority chain

SEGMENTS → MANIFEST → CHECKPOINT → CURSOR

Every recovery/advance authorization must verify the complete chain before returning an authorization result.

## Rules

1. Missing or invalid manifest fails closed.
2. Checkpoint manifest hash and generation must match the manifest.
3. Manifest inventory and segment verification must be valid.
4. Cursor checkpoint hash must match the checkpoint.
5. Cursor generation must not exceed checkpoint generation.
6. Acquisition position must be explicitly valid.
7. Cursor target must not regress.
8. This boundary is pure: it does not write state, modify evidence, or move the production cursor.

## Scope

This is an isolated authority contract and test boundary. It is not yet wired into IngestionEngine or BlockCursor.

Production integration remains a separate change requiring crash/recovery tests against the actual commit ordering.

## Safety

Historical evidence is untouched. No runtime state is migrated. No automatic trading behavior is introduced.