# STEP 485 — Independent Checkpoint/Cursor Recovery Verifier Implementation Boundary v0.1

Status: IMPLEMENTATION CANDIDATE

## Purpose

This implementation realizes the offline verification boundary defined by STEP 485 without changing production V4 authority.

## Implemented boundary

The independent verifier:

1. validates checkpoint lexical form and exact key set;
2. validates checkpoint-to-manifest hash and generation linkage from supplied verified manifest evidence;
3. recomputes the checkpoint domain-separated SHA-256 digest independently;
4. validates cursor lexical form and exact key set;
5. validates cursor-to-checkpoint hash linkage and generation ordering;
6. recomputes the cursor domain-separated SHA-256 digest independently;
7. validates stored checkpoint and cursor digest records;
8. requires acquisition-position validation as an explicit prerequisite;
9. returns a fail-closed recovery disposition;
10. performs all verification from local inputs only.

## Independence invariant

The implementation contains its own canonical JSON validation, canonicalization, domain separation, and SHA-256 logic.

It does not import src/reference/v4/*.

Agreement with the production/reference implementation is an observed compatibility result, not a dependency.

## Historical continuity

Historical PR #28 remains preserved and is not merged directly. Its reference implementation imported the production V4 hash helper and therefore does not satisfy the current independence boundary.

The existing checkpoint/cursor/recovery golden-vector fixture is not regenerated or silently normalized.

## Non-goals

This implementation does not:

- mutate production raw evidence;
- advance or reset a production cursor;
- mutate checkpoints or manifests;
- alter SQLite state;
- contact RPC or any network;
- change checkpoint/cursor hash semantics;
- define provider-specific acquisition-position mapping;
- replace production V4 authority;
- change existing golden-vector values.

## Verification evidence

The accompanying regression suite exercises valid checkpoint and cursor digests, stored-digest mismatch, manifest mismatch/missing evidence, non-canonical lexical forms, cursor/checkpoint mismatch, cursor generation ordering, valid recovery, corrupt segment fail-closed behavior, invalid acquisition position, unknown keys, and source-independence.

Freeze and state finalization are separate gates and are not implied by this implementation boundary.
