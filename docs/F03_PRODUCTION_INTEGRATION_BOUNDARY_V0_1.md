# HAHAWEEK — F-03 Production Integration Boundary V0.1

## Status

DESIGN-ONLY / INTEGRATION NOT CLOSED.

This document records the exact boundary required before V4 checkpoint authority can govern the production cursor.

## Current production ordering

The current ingestion path is:

1. acquire/process a block or batch;
2. persist the database batch;
3. advance the BlockCursor;
4. persist cursor state.

The existing cursor implementation is monotonic and advances only after the processor resolves, but it does not currently consume V4 manifest/checkpoint authority.

## Required V4 ordering

The production path must become:

```
ACQUISITION
    ↓
RAW EVIDENCE PERSIST
    ↓
MANIFEST / SEGMENT VALIDATION
    ↓
CHECKPOINT AUTHORIZATION
    ↓
CURSOR ADVANCE AUTHORIZATION
    ↓
CURSOR PERSIST
```

The exact implementation must preserve the existing invariant:

- processing failure => cursor does not advance;
- authority failure => cursor does not advance;
- cursor regression => rejected;
- restart => resume from the last authoritative persisted position.

## Non-negotiable constraints

1. Do not synthesize a V4 manifest or checkpoint merely to satisfy the API.
2. Do not make BlockCursor depend on an unpersisted or in-memory authority object.
3. Do not advance the cursor before the evidence/checkpoint commit boundary.
4. Do not silently migrate existing state.
5. Do not rewrite historical evidence.
6. Preserve raw evidence as authoritative.
7. Preserve the isolated V4 authority module as a pure validator.
8. Production integration must have crash/restart tests against the actual IngestionEngine path.

## Integration seam

The next implementation must introduce an explicit persisted authority record containing, at minimum:

- manifest hash;
- manifest generation;
- checkpoint hash;
- checkpoint input;
- cursor authority input;
- acquisition position validity.

The production cursor must only accept an advance after this persisted chain validates through the existing V4 authority module. The acquisition-specific position mapping for the current Robinhood block-range path is frozen in `docs/V4_ROBINHOOD_BLOCK_POSITION_CONTRACT_V0_1.md`.

## Why integration is not being implemented in this change

The current production state contains `lastProcessedBlock`, but the inspected production path does not yet persist the V4 manifest/checkpoint records required by the authority contract.

Wiring the pure validator directly into `BlockCursor.advance()` without those persisted records would create a false authority boundary.

Therefore this branch first records the integration contract. The next implementation should add the minimal persisted authority state and then wire it into the actual commit ordering.

## Production path audit — 2026-09-20

The current inspection confirms that `src/index.js#createEngine()` is still the legacy production path:

- it constructs `BlockCursor` directly;
- it constructs the legacy `IngestionEngine` without `v4CursorAdapter` / `v4Database`;
- its processors call `database.save()` internally;
- the V4 production engine seam exists separately but is not called by `createEngine()`.

This is an intentional safety boundary: V4 remains opt-in and the legacy production path is not silently migrated.

A critical integration constraint is also confirmed: V4 `IngestionEngine` owns the SQLite transaction around processor execution and cursor advancement, so the production V4 processor must not call `database.save()` from inside that transaction. The existing legacy processor callbacks therefore cannot simply be reused unchanged for V4.

The required next implementation is an explicit production factory seam that separates:

1. evidence mutation inside the SQLite transaction;
2. V4 authority/cursor advancement inside the same transaction;
3. durable database export only after the transaction commits.

No V4 default cutover is authorized by this audit.

## Validation target

F-03 can only be considered closed after all of the following are demonstrated:

- valid production batch advances the authoritative cursor;
- processor failure leaves cursor unchanged;
- authority failure leaves cursor unchanged;
- crash after evidence commit but before cursor commit recovers deterministically;
- restart produces no skipped block and no unauthorized regression;
- all existing regression/security tests remain green.

## Scope

This document does not modify runtime state, historical evidence, RPC behavior, trading behavior, or production execution.
