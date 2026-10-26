# STEP 588 — Runtime Generation Establishment Contract v0.1

Status: CONTRACT
Step: 588
Predecessor: STEP 587
Baseline: 9fe4976dbc32ba3a16fad4465b32f2816383a8a6
V4 production activation: INACTIVE

## Purpose

Freeze the missing runtime generation-establishment semantics identified by STEP 587 so the STEP 584 processing-context integration can be implemented without deriving generation from forbidden operational or authority sources.

This contract changes only the generation-establishment boundary. It does not redefine canonicality, transition states/edges, STEP 568 digest semantics, authority semantics, cursor semantics, or V4 activation.

## Generation authority

Generation is owned by the runtime canonical-lineage boundary. Its authoritative inputs are the exact canonical decision snapshot, persisted canonical processing lineage parent when one exists, and the canonical transition type.

Generation MUST NOT depend on cursor state, submitted/expected authority, checkpoint/manifest digests, writer-fence value, wall-clock time, randomness, RPC request ordering, hash truncation, or implicit fallback.

## Genesis generation

For INITIAL with no parent result, the protocol genesis generation is exactly the canonical decimal string "1". This is a frozen protocol constant, not a runtime fallback. INITIAL with a parent is rejected.

## Continuation generation

For CONTINUATION, a persisted accepted parent MUST exist and generation MUST equal the parent's persisted generation. No increment occurs. Missing/conflicting parent is a hard failure.

## Reorg replacement generation

For REORG_REPLACEMENT, a persisted accepted parent MUST exist and the canonical decision MUST establish the replacement branch. The new generation is exactly parent generation plus one as an unsigned uint64 decimal string. Overflow is a hard failure. Equality with the parent is invalid. The parent remains immutable.

This increment is a contractually defined lineage transition rule, not a cursor/authority-derived value.

## Determinism

Identical canonical decision input, parent lineage, transition type, and exact range MUST produce identical generation and deterministic result/execution/lineage identities. Replay/restart MUST NOT allocate a new generation.

## Parent selection

CONTINUATION parent: the accepted result whose exact range ends immediately before the requested range and whose canonical lineage is valid.

REORG_REPLACEMENT parent: the accepted result being replaced by the new canonical branch according to persisted canonical decision/common-ancestor evidence.

Ambiguous/multiple parents fail closed. Parent selection never uses cursor or authority.

## Integration

The generation resolver runs after canonical decision verification and before STEP 579 identity derivation, supplying transitionType, parentResultId, and generation. STEP 579 remains owner of transition history and identity formulas.

## Historical preservation

Prior generations/results remain immutable. Reorg creates a new result/lineage context; prior evidence remains queryable. No generation-history UPDATE/DELETE/reset.

## Fail closed

Reject missing/ambiguous parent, malformed generation, uint64 overflow, invalid transition/parent combination, canonical decision mismatch, reorg without replacement branch, replay generation mismatch, writer-fence loss, or conflicting existing identity. No fallback generation.

## Golden vectors

1. INITIAL/no parent → "1".
2. CONTINUATION parent "1" → "1".
3. REORG parent "1" → "2".
4. REORG parent "18446744073709551615" → overflow rejection.
5. identical reorg replay → same generation/result identity.
6. authority/cursor changes do not change generation.
7. missing/ambiguous parent → rejection.

## Compatibility

STEP 576/578 canonical decision, STEP 571/579 transition states/edges, STEP 568 digest semantics, F-03 authority, cursor API/order, existing writer fence, historical evidence, and V4 INACTIVE boundary remain unchanged.

## Acceptance

Contract merged; PR-head tests/security/CodeQL pass; review evidence exists; merge succeeds; exact merge commit post-merge workflows pass; reconciliation/documentation records STEP 589.

V4 production activation remains INACTIVE.
