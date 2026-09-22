# Evidence Graph Specification v0.1

## Purpose

The Evidence Graph is a deterministic projection of authoritative HAHAWEEK
evidence. It connects evidence into a queryable structure without becoming a
source of truth.

## Authority

`raw_events` and canonical evidence remain authoritative for evidence content.
The graph may be discarded and rebuilt from those records.

## Core nodes

- BLOCK
- TRANSACTION
- CONTRACT
- EVENT
- POOL
- TOKEN
- WALLET
- FORMATION

## Core edges

- CONTAINS
- EMITS
- CREATES
- ASSOCIATED_WITH
- OCCURS_IN
- REFERENCES
- FOLLOWS

## MVP structural projection

For each canonical RAW_LOG evidence record:

`BLOCK → TRANSACTION → EVENT`

and:

`EVENT → CONTRACT`

with explicit occurrence:

`EVENT → BLOCK`

For a Formation Result, the graph adds:

`FORMATION → REFERENCES → EVENT`

## Invariants

1. Graph projection never mutates raw or canonical evidence.
2. Graph is rebuildable from authoritative evidence.
3. Identical projection is idempotent.
4. Conflicting content for an existing graph node/edge is rejected.
5. Formation references must resolve to projected evidence.
6. Graph ordering is deterministic.
7. Graph does not establish ownership, control, bot status, or prediction.
8. Graph does not advance ingestion cursors or commit evidence.

## Important boundary

`GRAPH ≠ SOURCE OF TRUTH`

`GRAPH ≠ VALIDATION`

`GRAPH ≠ PREDICTION`

`GRAPH = REBUILDABLE EVIDENCE PROJECTION`
