# F-02D IngestionEngine Adapter Design

Status: DESIGN-ONLY — NOT RUNTIME-ACTIVE

## Objective

Define the minimal integration point for identity-aware block verification in the existing IngestionEngine without replacing the legacy cursor or changing default behavior.

## Adapter contract

The adapter receives:

- previous authoritative block identity, when available;
- current authoritative block identity;
- current legacy cursor, when the cursor has not yet been identity-bound.

It returns one explicit decision:

- INITIAL_BIND
- CONTINUE
- STOP_REORG
- FAIL_CLOSED
- CONFLICT
- RECONCILIATION_REQUIRED

The adapter must be pure. It must not write state, delete evidence, mutate the cursor, perform rollback, or assign canonical/orphan status.

## Runtime ordering

For an identity-aware run:

1. read the existing cursor;
2. acquire authoritative current block identity;
3. establish/reconcile the previous identity;
4. evaluate the adapter;
5. if CONTINUE, process the evidence range;
6. durably commit evidence;
7. advance the cursor only after successful commit;
8. persist the resulting identity/checkpoint state.

For STOP_REORG, FAIL_CLOSED, CONFLICT, or RECONCILIATION_REQUIRED, the cursor must not advance.

## Legacy compatibility

The existing block-number cursor remains readable. No block hash or parent hash may be fabricated from a number.

Identity binding is an explicit state transition. A mismatch requires reconciliation rather than automatic overwrite.

## Failure semantics

RPC failure, malformed identity, identity conflict, reorg detection, evidence commit failure, or persistence failure must leave the last authoritative cursor boundary unchanged.

## Implementation gate

The first code change should be behind an explicit option or dependency seam, with the default legacy behavior preserved until integration tests and recovery tests pass.

No V4 production activation is authorized by this document.
