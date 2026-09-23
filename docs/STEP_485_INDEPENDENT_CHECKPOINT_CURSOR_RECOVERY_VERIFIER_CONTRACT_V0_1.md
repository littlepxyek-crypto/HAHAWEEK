# STEP 485 — Independent Checkpoint/Cursor/Recovery Verifier Contract v0.1

Status: CONTRACT CANDIDATE

## Purpose

Define the next auditable boundary after STEP 484 for an offline verifier of the committed V4 checkpoint/cursor/recovery golden-vector protocol.

STEP 484 froze complete coverage of the generic V4 event-identity, payload-event-identity, and transition fixture corpus. The remaining checkpoint/cursor/recovery fixture is a distinct protocol and is therefore not silently folded into STEP 484.

## Scope

STEP 485 may establish an independent, offline verifier for:

- canonical checkpoint input validation and digest verification;
- canonical cursor input validation and digest verification;
- checkpoint-to-manifest linkage supplied as verified input;
- cursor-to-checkpoint hash linkage;
- cursor generation not exceeding checkpoint generation;
- fail-closed recovery disposition;
- acquisition-position validation as an explicit prerequisite, without defining provider-specific position mapping.

The verifier must consume the existing committed checkpoint/cursor/recovery vectors without regenerating or silently normalizing them.

## Independence boundary

The independent verifier MUST:

- use only offline local inputs;
- implement the required canonicalization/hash verification independently;
- not import `src/reference/v4/*` as a verification dependency;
- not mutate production ingestion, raw evidence, SQLite, cursor state, checkpoint state, manifest state, migration state, or runtime state;
- not contact RPC/network services;
- fail closed on malformed, inconsistent, unverifiable, or incomplete recovery evidence.

Agreement with a production/reference implementation is an observed verification result, not a dependency.

## Evidence boundary

The verifier must preserve the distinction between:

1. checkpoint/cursor input objects;
2. their stored application-level digest representation;
3. referenced manifest/segment verification supplied to the boundary;
4. recovery disposition.

The generic cryptographic digest representation and application-level `0x` representation must not be conflated.

## Historical continuity

PR #28 (`v4: add offline recovery verifier`) is a historical implementation attempt based on an older main commit. It MUST NOT be merged directly or treated as current implementation authority.

Its useful requirements and evidence may be audited and reimplemented against current main under this contract.

Existing `checkpoint-cursor-recovery.json` content remains historical evidence and must not be regenerated or silently rewritten by this contract.

## Required verification cases

At minimum, the implementation must prove:

- valid checkpoint;
- invalid/mutated checkpoint digest;
- checkpoint/manifest hash mismatch;
- checkpoint/manifest generation mismatch;
- valid cursor;
- cursor/checkpoint hash mismatch;
- cursor generation ahead of checkpoint;
- invalid/mutated cursor digest;
- valid recovery chain;
- corrupt/unverified manifest or segments;
- invalid acquisition position;
- unknown keys / non-canonical key sets;
- malformed or wrong lexical forms;
- deterministic fail-closed disposition.

## Non-goals

This contract does not:

- modify production V4 authority;
- define manifest or segment byte-level sealing semantics;
- define acquisition-provider cursor mapping;
- change checkpoint/cursor hash semantics;
- change existing golden-vector values;
- activate migration;
- alter raw evidence;
- advance production cursors;
- introduce prediction, ranking, trading, signing, or publication behavior.

## Acceptance gates

1. Contract review establishes the exact verifier boundary.
2. Existing golden-vector semantics are preserved unless a separate explicit contract-resolution boundary is required.
3. Historical PR #28 remains preserved.
4. Implementation is independent of `src/reference/v4/*`.
5. Implementation remains offline/audit-only.
6. Required negative and positive recovery cases are covered.
7. Security & Regression and CodeQL gates pass.
8. Freeze and state finalization are separate subsequent steps.

## Relationship

STEP 482 — Independent Golden Vector Verification Boundary  
→ STEP 483 — Independent Golden Vector Verifier  
→ STEP 484 — Complete V4 Golden Vector Coverage  
→ STEP 485 — Independent Checkpoint/Cursor/Recovery Verifier

STEP 485 does not replace or reopen the frozen STEP 482–484 boundaries.
