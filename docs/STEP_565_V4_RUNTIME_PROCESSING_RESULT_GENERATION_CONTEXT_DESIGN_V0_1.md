# STEP 565 — V4 Runtime Processing-Result / Generation Context Design v0.1

## Design boundary

STEP 565 intentionally defines the interface rather than implementing persistence.

Conceptual flow:

Canonical processing
→ immutable processing-result context
→ canonicality/reorg validation
→ STEP 564 evidence commitment derivation
→ submitted authority candidate
→ independent expected authority
→ binding
→ cursor advancement.

The processing-result context is upstream of authority derivation and must never read the expected-authority source to determine its own generation.

## Implementation gate

If repository inspection cannot identify an existing durable context satisfying the contract, STEP 566 must define and implement the smallest new persistence contract required for that context.

No schema or runtime code is changed by STEP 565.
