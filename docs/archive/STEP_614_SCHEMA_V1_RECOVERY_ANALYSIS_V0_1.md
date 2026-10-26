# STEP 614 — Schema v1 Runtime Recovery Analysis v0.1

## Trigger

Actual operator evidence on 2026-09-27 showed:
- RPC reachable with VPN; Chain ID 4663 verified.
- `./bin/hahaweek scan` failed closed with `UNSUPPORTED_SCHEMA_VERSION`.
- Read-only inspection of `data/hahaweek.sqlite` showed `schema_version = 1` and only the legacy base tables.

## Finding F-614-03

The current database runtime supports migrations beginning at schema v3 and rejects schema v1. The operator database is therefore blocked at the database compatibility boundary before ingestion/recovery can execute.

## Repository-grounded historical evidence

Historical repository versions contain the original schema-v1/v2/v3 upgrade behavior:
- commit `6de83a7041c6e3735b3b1612ac70f62fd3ea9c91` contains the database implementation that starts legacy databases at schema v1, adds `block_hash` and `transaction_index`, and persists schema version 2.
- commit `0deab38b4bce451fd3404271fe837f8cd94bc057` contains the next historical implementation adding the `canonical_evidence` table and persisting schema version 3.
- Current `main` already treats schema v3 as the first supported migration boundary and has deterministic v3→v8 migrations.

Therefore v1→v3 can be restored from repository history without inventing evidence semantics.

## Boundary

This finding is within STEP 614 because it concerns repository-supported operator recovery and actual live runtime usability. It does not change raw/canonical evidence meaning, cursor authority, Surveillance authority, V4 activation, trading, signing, or execution.

## Safety

Migration must:
- preserve all existing legacy rows;
- add only repository-defined schema structures;
- never delete evidence;
- never reset or advance the cursor;
- execute transactionally where migration already does so;
- validate resulting v3-compatible base schema before continuing;
- remain fail-closed on malformed/ambiguous legacy schema.

## Non-goals

No redesign of schema semantics; no data rewriting; no cursor recovery shortcut; no manual modification of operator database.

## Authorized next phase

Design for F-614-03.
