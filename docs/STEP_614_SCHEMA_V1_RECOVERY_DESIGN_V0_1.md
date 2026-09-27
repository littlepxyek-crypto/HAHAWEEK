# STEP 614 — Schema v1 Runtime Recovery Design v0.1

## Design target

Restore the repository-defined legacy database migration boundary so an actual schema-v1 operator database can enter the existing supported v3→v8 migration chain.

## Design

1. Add `migrateV1ToV3(db)` in `src/core/database.js`.
2. Validate the legacy base schema before mutation using the existing `assertRequiredBaseSchema` after the v1→v3 transformation prerequisites are established.
3. Add only the historically defined missing raw-location columns:
   - `raw_events.block_hash`
   - `raw_events.transaction_index`
4. Add the historically defined `canonical_evidence` table and foreign key to `raw_events(event_id)`.
5. Persist `schema_version = 3` only after the v1→v3 transaction commits.
6. Route schema version 1 through v1→v3, then the existing v3→v8 chain.
7. Keep the migration idempotence/validation boundary fail-closed: malformed base schema must not be silently normalized.
8. Preserve all existing rows and do not touch state.json, cursor, authority lifecycle, raw JSONL, or operator data outside the SQLite schema migration.

## Transaction boundary

The v1→v3 structural migration is transactional. On failure, rollback leaves the original schema version and data intact.

## Recovery boundary

This design only removes the database compatibility blocker. It does not declare runtime healthy. After migration, the existing repository-supported `scan` must perform the normal recovery path and establish operational state through the existing ingestion/authority/cursor controls.

## Verification

Tests will create a true schema-v1 fixture with legacy rows, run `createDatabase()`, verify schema v8 and required tables/columns, verify legacy rows are byte/value-preserved at the logical row level, and verify malformed v1 schema fails closed.

## Non-goals

No cursor reset, evidence rewrite, canonicalization change, authority expansion, V4 activation, trading/signing/execution, or Surveillance change.
