# F-02D Runtime Reorg Boundary Verification

This boundary test defines the fail-closed contract between reorg detection and future ingestion runtime integration.

## Required behavior

- CONTINUOUS may permit normal advancement.
- REORG_DETECTED must preserve the current cursor.
- INVALID_INPUT must preserve the current cursor.
- Existing evidence must remain intact.
- ReorgDetector has no rollback/delete/canonicalization authority.

This is a provider-independent boundary test. It does not claim that the production IngestionEngine now handles reorgs.

## Runtime integration gate

Only after this boundary is verified may the runtime ingestion path be modified to consume the detector result.
