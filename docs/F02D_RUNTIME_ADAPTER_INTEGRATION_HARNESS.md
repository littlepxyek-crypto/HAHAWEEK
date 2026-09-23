# F-02D Runtime Adapter Integration Harness

Status: DESIGN/TEST HARNESS — NOT PRODUCTION ACTIVE

This harness defines the acceptance boundary between the identity-aware decision layer and ingestion persistence without modifying IngestionEngine.

## Contract

For each candidate block:

1. acquire authoritative identity;
2. evaluate identity-aware boundary;
3. only CONTINUE may enter evidence processing;
4. evidence must commit successfully;
5. only after commit may the cursor advance.

STOP_REORG, FAIL_CLOSED, CONFLICT, and RECONCILIATION_REQUIRED never advance the cursor.

## Required scenarios

- continuous block advances only after evidence commit;
- reorg stops before evidence processing and cursor advancement;
- invalid identity fails closed;
- identity conflict is isolated;
- legacy cursor mismatch requires reconciliation;
- evidence commit failure leaves cursor unchanged;
- restart preserves committed evidence;
- replay is idempotent.

## Non-goals

This harness does not claim production reorg handling and does not authorize V4 cutover. Existing legacy runtime behavior remains unchanged.

## Acceptance

The harness is accepted only when its executable tests pass in CI and the production integration remains explicitly gated.
