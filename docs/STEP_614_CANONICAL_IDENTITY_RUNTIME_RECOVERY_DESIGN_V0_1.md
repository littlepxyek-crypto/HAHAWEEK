# STEP 614 — Canonical Identity Runtime Recovery Design v0.1

## Design

Introduce a small pure mapping function in `src/index.js` that constructs the complete raw-event-store record from a provider log and the deterministic event id.

The mapping must include:
- event_id
- chain_id
- block_number
- transaction_hash
- block_hash
- transaction_index
- log_index
- address
- topics
- data
- captured_at

Use that record for `rawEventStore.insert()` regardless of whether `appendUnique()` reports INSERTED or IDEMPOTENT. The database store already enforces digest equality and idempotency.

## Recovery behavior

If a previous canonical processing attempt rolled back SQLite after raw acquisition:
- the append-only raw file remains authoritative raw evidence;
- the next run sees the raw record as IDEMPOTENT;
- the complete record is reconciled into SQLite;
- canonical identity can then be evaluated from complete preserved evidence.

No cursor reset or historical deletion is introduced.

## Non-goals

No changes to:
- evidence identity algorithm
- canonicalization semantics
- authority
- cursor semantics
- V4
- Surveillance
- signing/trading/execution
- provider semantics

## Acceptance

1. Runtime SQLite raw projection contains block hash and transaction index.
2. Retry after partial processing can reconcile preserved raw evidence into SQLite.
3. Existing raw-event integrity conflict behavior remains unchanged.
4. Canonical identity gate remains fail-closed when required fields are genuinely absent.
5. Targeted tests and full security/regression CI pass.
