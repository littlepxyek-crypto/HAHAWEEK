# F-02D Block Identity Authority v0.1

Status: SPECIFICATION — IMPLEMENTATION PENDING

## Canonical identity record

A committed block identity contains:
- chainId
- blockNumber
- blockHash
- parentHash
- observedAt

## Validation

- chainId: positive integer
- blockNumber: non-negative integer
- blockHash: non-empty string
- parentHash: non-empty string for blockNumber > 0
- observedAt: non-empty timestamp string

## Immutability

A committed identity is immutable. A later observation with the same chainId + blockNumber but a different blockHash is a conflict, not an overwrite.

## Side-effect boundary

Block Identity Authority MUST NOT:
- mutate the ingestion cursor;
- delete evidence;
- assign CANONICAL or ORPHANED;
- perform rollback;
- infer market/token outcomes.

## Reorg boundary

A conflicting block identity is evidence for reorg investigation. Reorg classification remains the responsibility of the ReorgDetector/transition layer.
