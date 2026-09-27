# STEP 614 — CBDR Runtime Recovery Design v0.1

## Status

DESIGN — AUTHORIZED by the verified F-614-06 Analysis.

## Objective

Recover an already durable, verified exact-range processing context before retrying temporal canonical-decision construction.

## Scope

This design is limited to STEP 614 runtime recovery. Existing CBDR identity, snapshot identity, authority, cursor, evidence, reorg, Surveillance, V4, trading, signing, and execution semantics remain unchanged.

## Recovery order

```
writer verification
→ exact durable lineage lookup
→ lineage reconstruction
→ canonical snapshot reconstruction
→ current provider identity verification
→ reuse only when identities match
→ otherwise existing processing path
```

### Durable lookup

Query `canonical_lineage` for the exact range.

- zero matches: use the existing processing path;
- one match: reconstruct and verify it;
- multiple matches: fail closed;
- reconstruction failure: fail closed.

### Snapshot verification

Use existing `reconstructSnapshot()`.

It verifies snapshot membership, range/ordinal continuity, CBDR integrity, parent linkage, and snapshot digest.

### Current provider verification

Before reuse, verify the provider network and every block in the stored processing range.

For each block, number, block hash, and parent hash must match the durable snapshot.

If provider data is unavailable or malformed, recovery stops safely.

If all identities match, reuse the durable processing context. A newer provider head alone does not create a new CBDR for the same already-verified range.

### Reorg behavior

If a current block identity differs:

- do not reuse the old context;
- preserve the existing durable history;
- continue through the existing canonical decision and reorg/replacement path.

No latest-wins behavior is introduced.

### Reconstructed context

Reuse returns the same VERIFIED processing-context fields currently produced by `createVerifiedProcessingContext()`, including range, processing IDs, generation, evidence IDs, lineage ID, provenance, committed timestamp, and canonical snapshot ID.

No new context records are required when recovery succeeds.

## Failure behavior

Fail closed for:

- conflicting exact durable lineages;
- incomplete or corrupted durable lineage;
- missing snapshot;
- snapshot integrity conflict;
- chain mismatch;
- malformed block;
- provider failure during verification.

Provider unavailability is not treated as negative evidence.

## Test requirements

1. Durable retry with a newer provider head reuses the original context.
2. Current block identity is verified before reuse.
3. Provider identity mismatch does not replace stored history.
4. Durable corruption fails closed.
5. Multiple exact lineages fail closed.
6. Authority-failure restart/retry no longer produces a replay CBDR conflict.

## Acceptance

Existing integrity and reorg tests remain green. Evidence and cursor semantics remain unchanged. Repository security/regression and CI must pass. Actual Termux retry must provide the final runtime evidence.

Global VERIFIED LIVE remains blocked until the complete operator recovery lifecycle is evidenced.
