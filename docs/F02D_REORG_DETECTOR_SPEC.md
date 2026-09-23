# F-02D Reorg Detector Contract v0.1

Status: SPECIFICATION ONLY — NOT IMPLEMENTED

## Purpose

Detect a break in block-parent continuity without mutating HAHAWEEK evidence, cursor, or canonical state.

## Input

A detector observation contains:
- previous block number
- previous block hash
- current block number
- current block hash
- current parent hash

## Decision

- CONTINUOUS: current.parentHash equals previous.hash and current block number is previous + 1.
- REORG_DETECTED: current.parentHash differs from previous.hash for an otherwise valid adjacent block.
- INVALID_INPUT: required fields are missing or malformed, or block numbers are not adjacent.

## Determinism

The same normalized input must produce the same result and no side effects.

## Forbidden side effects

The detector MUST NOT:
- advance or regress the cursor;
- delete or mutate historical evidence;
- perform rollback;
- assign CANONICAL or ORPHANED state;
- infer market or token outcomes.

## Boundary

REORG_DETECTED is an observation/fact about continuity. Transition handling belongs to the temporal/validation state layer and must be separately specified and tested.

## Security / fail-closed

Malformed input returns INVALID_INPUT. No implicit normalization of missing hashes or block numbers is permitted.

Design Gate 2 remains OPEN.
