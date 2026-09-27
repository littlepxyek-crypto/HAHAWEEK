# STEP 614 — Canonical Identity Runtime Recovery Analysis v0.1

## Finding F-614-05

Actual operator scan on 2026-09-27 progressed past F-614-04 and fetched 21 logs for blocks 64986697-64986706, then failed closed with:

`CANONICAL_EVIDENCE_IDENTITY_INCOMPLETE`

Repository inspection shows the runtime mapping in `src/index.js` passes a reduced object to `rawEventStore.insert()`. It omits `block_hash` and `transaction_index`, even though `appendUnique()` already preserves both fields in the append-only raw record.

Canonical evidence identity explicitly requires both fields. Therefore the durable SQLite raw-event projection is incomplete and canonical identity correctly refuses to proceed.

## Recovery-specific impact

The failed processing-context path restores its SQLite snapshot, while the append-only raw file retains acquired records. On retry, `appendUnique()` returns an idempotent duplicate and the current code only calls `rawEventStore.insert()` for newly inserted raw records. Without correction, a retry can leave the SQLite raw-event projection incomplete even though the preserved raw file contains the required identity fields.

## Root cause

1. Runtime raw-event projection omitted `block_hash` and `transaction_index`.
2. The projection was only persisted to SQLite for newly inserted append-only records, preventing idempotent recovery of rows after a transaction rollback.

## Contract check

This remains inside STEP 614 actual operator usability, evidence preservation, recovery, failure diagnosis, and verification. No frozen evidence semantics or authority semantics are changed.

## Required bounded correction

- Build the SQLite raw-event record from the same complete raw acquisition fields already preserved by `appendUnique()`.
- Make the SQLite projection idempotently reconcile on both INSERTED and IDEMPOTENT raw acquisition results.
- Preserve raw file history; never rewrite or delete it.
- Add regression coverage for complete identity fields and idempotent SQLite reconciliation.
