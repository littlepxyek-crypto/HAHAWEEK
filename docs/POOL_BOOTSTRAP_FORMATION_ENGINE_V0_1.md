# HAHAWEEK — Pool Bootstrap Formation Engine v1

Status: IMPLEMENTATION CANDIDATE  
Step: 426  
Scope: MVP `POOL_BOOTSTRAP`

## Purpose

Implement the canonical formation predicate without coupling it to RPC acquisition or a specific protocol adapter.

Canonical sequence:

`POOL_CREATED → LIQUIDITY_ADDED → FIRST_SWAP`

The engine consumes already interpreted semantic events. It does not decode raw RPC logs.

## Ordering

Events are ordered by:

`(block_number, transaction_index, log_index)`

`FIRST_SWAP` is the earliest valid `SWAP` occurring at or after the selected liquidity event.

## States

- `OBSERVED`: no sufficient formation evidence yet.
- `PARTIAL`: some formation evidence exists, but the sequence is incomplete.
- `CANDIDATE`: pool creation and liquidity are evidenced, but first swap is not yet evidenced.
- `VALID`: all three required events are evidenced in canonical temporal order.

Missing evidence is not treated as false evidence.

## Boundaries

The engine:

- does not mutate raw evidence;
- does not create or modify evidence identity;
- does not advance acquisition cursors;
- does not perform validation;
- does not predict outcomes;
- does not decode protocol-specific logs;
- rejects mixed pool contexts instead of silently merging them.

## Formation identity

`formation_id` is a deterministic analytical identity derived from:

- formation rule version;
- formation type;
- chain;
- pool;
- ordered selected evidence IDs.

It is distinct from evidence identity.

## Protocol boundary

Protocol-specific decoding remains upstream:

`RAW RPC → CANONICAL EVIDENCE → PROTOCOL ADAPTER → SEMANTIC FORMATION EVENTS → FORMATION ENGINE`

The existing V4 implementation remains preserved. This engine does not replace it.

## Verification

The implementation must pass deterministic tests for:

1. valid sequence;
2. earliest first swap;
3. incomplete formation;
4. invalid temporal ordering;
5. mixed pool context;
6. deterministic formation identity.

`DESIGNED ≠ EXECUTED ≠ VERIFIED ≠ FROZEN`
