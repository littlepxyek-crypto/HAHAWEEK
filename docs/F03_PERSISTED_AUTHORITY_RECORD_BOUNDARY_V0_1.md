# HAHAWEEK — F-03 Persisted Authority Record Boundary V0.1

## Status

DESIGN LOCK — no runtime migration in this change.

## Purpose

Define the persistence boundary required before V4 authority is wired into production cursor advancement.

## Decision

V4 authority state MUST be persisted in the same durable transaction boundary as the production cursor commit.

A separate JSON authority file MUST NOT be introduced for the production path because the evidence database and cursor state would otherwise have independent commit points.

The production commit boundary is therefore:

```
evidence writes
    +
V4 authority record
    +
cursor projection
    ↓
ONE durable commit
```

## Required authority record

The persisted record MUST preserve the exact V4 inputs and their digests:

- manifest generation
- manifest hash
- checkpoint input
- checkpoint hash
- cursor input
- cursor hash
- acquisition position validity

The record MUST NOT silently normalize or reconstruct these fields.

## Recovery ordering

On startup:

1. load the latest persisted authority record;
2. verify manifest integrity references;
3. verify checkpoint canonical input and digest;
4. verify checkpoint-to-manifest binding;
5. verify cursor canonical input and digest;
6. verify cursor-to-checkpoint binding;
7. verify acquisition-specific position;
8. only then expose the resume position to ingestion.

Any failed step MUST fail closed.

## Commit ordering

For a successful acquisition batch:

1. acquire and validate evidence;
2. persist evidence;
3. construct the next authority record;
4. validate the complete V4 authority chain;
5. commit evidence + authority + cursor together;
6. only after durable commit report the batch complete.

The cursor MUST NOT become durable before the authority chain is durable.

## Crash semantics

The implementation MUST prove:

- crash before commit => previous authoritative state remains;
- crash after commit => new authoritative state is recoverable;
- processor failure => no cursor advancement;
- authority failure => no cursor advancement;
- restart => deterministic resume;
- cursor regression => rejected.

There must be no state where the cursor claims progress that the authority record cannot justify.

## Historical preservation

The implementation MUST NOT overwrite raw evidence.

Authority updates MUST preserve the integrity-relevant previous record or provide an append-only/versioned record identity sufficient to reconstruct the prior authoritative state.

## Migration rule

Existing legacy `data/state.json` containing only `lastProcessedBlock` MUST NOT be silently converted into V4 authority.

Until an explicit migration contract exists, legacy state remains legacy state and cannot be treated as V4 authority.

## Next implementation

The next code change should add the minimal SQLite persistence primitives and transaction tests, without changing live ingestion behavior. Only after those tests pass should `BlockCursor` and `IngestionEngine` be wired to the new authority commit boundary.
