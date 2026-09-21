# F-02D Runtime Reorg Adapter Contract

This contract is the controlled boundary between block identity/reorg detection and the ingestion runtime.

## Authority

The adapter may classify whether runtime processing may continue. It does not own cursor mutation, evidence deletion, rollback, canonicalization, or orphan assignment.

## Mapping

- CONTINUOUS -> CONTINUE
- REORG_DETECTED -> STOP_REORG
- INVALID_INPUT -> FAIL_CLOSED

The caller must advance the cursor only after successful evidence processing. STOP_REORG and FAIL_CLOSED must never advance the cursor.

## Scope

Provider-independent contract. It does not modify IngestionEngine and does not claim production reorg handling.
