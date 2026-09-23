# F-02D Ingestion Integration Harness

Provider-independent integration harness for the boundary between legacy checkpoint compatibility, block identity, reorg detection, evidence processing, and cursor advancement.

Acceptance invariants:

1. Legacy block-number-only state may bind only to an authoritative identity with the same block number.
2. A mismatched identity requires reconciliation and cannot advance the checkpoint.
3. CONTINUOUS permits processing.
4. REORG_DETECTED stops processing and preserves the cursor.
5. INVALID_INPUT fails closed and preserves the cursor.
6. Evidence is committed before cursor advancement.
7. This harness does not modify IngestionEngine and does not claim production runtime reorg handling.
