# STEP 545 — F-03 Cryptographic Binding at the Ingestion Authority Boundary Contract v0.1

## Purpose

Close the next explicit F-03 evidence gap after STEP 544: prove that the cryptographic authority binding is enforced at the existing ingestion cursor-advance boundary, not only by an isolated validator.

## Scope

This step integrates the STEP 544 cryptographic binding validator into the existing F-03 authority adapter and proves the boundary behavior with executable tests.

This step does not:
- activate V4 globally;
- change RPC/provider selection;
- reset or rewrite the cursor;
- rewrite or delete historical evidence;
- migrate SQLite;
- replace legacy persistence;
- silently normalize authority material.

## Required behavior

1. The existing F-03 authority gate remains the boundary immediately before cursor advancement.
2. A complete authority record presented at that boundary MUST include a valid cryptographic binding digest.
3. The boundary MUST validate the authority record against the expected authority commitments supplied by the authority source.
4. Missing binding material MUST fail closed before cursor advancement.
5. A tampered binding digest MUST fail closed before cursor advancement.
6. A segment, manifest, checkpoint, generation, or cursor commitment mismatch MUST fail closed before cursor advancement.
7. A valid identical authority binding MUST be accepted deterministically.
8. Repeating the same accepted authority validation MUST produce the same validation result and MUST NOT mutate authority state.
9. The integration MUST preserve the existing checkpoint-before-cursor ordering.
10. Existing F-03 structural validation remains required; cryptographic binding validation does not replace it.
11. The implementation MUST remain opt-in at the authority adapter boundary and MUST NOT claim global V4 production activation.
12. Existing F-03 tests and V4 golden-vector tests MUST remain compatible.
13. No authority field may be silently replaced, normalized, or regenerated during validation.

## Acceptance evidence

- Contract merged to main.
- Implementation integrates STEP 544 binding validation into the existing F-03 ingestion authority adapter.
- Direct ingestion-boundary test proves valid cryptographically bound authority passes.
- Direct ingestion-boundary test proves missing binding fails closed.
- Direct ingestion-boundary test proves tampered binding fails closed.
- Direct ingestion-boundary tests prove each commitment mismatch fails closed.
- Test proves the cursor is not advanced when binding validation fails.
- Test proves identical accepted validation is deterministic/replay-safe.
- Existing HAHAWEEK Tests remain green.
- Existing Security & Regression remains green.
- No V4 production activation, cursor reset, historical rewrite/deletion, RPC change, or SQLite migration is introduced.
