# F-02D Legacy Cursor Compatibility Contract

## Purpose

Define how HAHAWEEK transitions from the legacy block-number-only cursor to identity-aware ingestion without fabricating blockchain provenance or mutating historical evidence.

## Legacy state

A legacy state may contain only `lastProcessedBlock`. This value is a checkpoint position, not proof of a block hash or parent hash.

## Rules

1. Never synthesize `blockHash` or `parentHash` from a block number.
2. Never overwrite legacy state merely to make it appear identity-aware.
3. A legacy cursor may be classified as `BLOCK_NUMBER_ONLY` until an authoritative identity is acquired and validated.
4. Identity-aware continuation requires an authoritative previous block identity and a validated current identity.
5. If the previous identity cannot be established, the runtime must enter an explicit bootstrap/reconciliation path rather than guessing.
6. Reconciliation must preserve all existing evidence and must not advance the cursor past an unverified boundary.
7. Migration metadata must be auditable and versioned.

## Compatibility states

- `LEGACY_NUMBER_ONLY`: block number exists; identity unknown.
- `IDENTITY_BOUND`: authoritative block identity is attached to the checkpoint.
- `RECONCILIATION_REQUIRED`: identity cannot safely be established.

## Non-goals

This contract does not modify `IngestionEngine`, perform migration, or authorize production V4 cutover.
