# STEP 559 — V4 Production Implementation Boundary Contract v0.1

Status: CONTRACT
Step: 559

## 1. Purpose

Define the reviewed implementation boundary that follows Design Gate 2 PASS and permits implementation work toward V4 production authority without activating V4 production authority in this step.

STEP 559 is contract-only. It does not change production authority, cursor semantics, evidence history, RPC/provider selection, storage schema, or runtime behavior.

## 2. Preconditions

Implementation under this contract is authorized only because current `main` records Design Gate 2 as PASS at STEP 558.

The implementation must preserve:
- F-01..F-05 VERIFIED / FROZEN evidence;
- H-01..H-05 VERIFIED / FROZEN evidence;
- committed V4 golden vectors and their independent verifier boundary;
- the enforceable legacy/V4 authority boundary and durable expected-authority source;
- all historical contracts, tests, reconciliations, commits, and artifacts.

## 3. Scope

The subsequent implementation boundary may introduce the minimum production wiring required to make the already-verified V4 authority path executable under the frozen contracts.

The implementation must:
1. consume the durable expected-authority source defined by F-03;
2. require exact processed-range identity and cryptographic linkage before authority is accepted;
3. preserve fail-closed behavior for missing, malformed, stale, conflicting, or unverifiable authority evidence;
4. preserve H-01 legacy-write freeze and H-03 writer fencing;
5. preserve H-04 durability/recovery ordering;
6. preserve H-02 duplicate/collision classification;
7. preserve F-04 migration and F-05 acquisition provenance boundaries;
8. preserve deterministic replay and reorg-aware evidence semantics;
9. avoid introducing alternate or implicit authority sources.

## 4. Explicit non-goals

STEP 559 MUST NOT:
- activate V4 production authority;
- switch the live production cursor/checkpoint authority;
- reset or rewrite the cursor;
- rewrite, delete, silently normalize, or replace historical evidence;
- change RPC/provider selection;
- perform an uncontracted SQLite/schema migration;
- bypass legacy freeze or writer fencing;
- introduce prediction, ranking, trading, signing, or external publication behavior;
- weaken or delete existing tests/golden vectors to obtain green CI.

## 5. Activation boundary

V4 production activation requires a separate reviewed step after implementation and verification.

No code merged under STEP 559 may make V4 active merely by being present on `main`. Activation must be explicit, observable, fail-closed, and backed by fresh acceptance evidence.

## 6. Acceptance criteria

STEP 559 is complete only when:
- this contract is merged to `main`;
- PR-head Tests and Security/Regression are GREEN;
- review confirms the scope and non-goals;
- merge evidence is recorded;
- post-merge observations are recorded without fabricating unavailable CI;
- reconciliation documents the exact implementation authorization boundary;
- the next step is explicitly recorded as the implementation step.

## 7. Traceability

Requirement → STEP 559 contract → reviewed implementation boundary → subsequent implementation/tests → CI → commit → PR → merge → post-merge verification → reconciliation.

## 8. Preservation

No historical artifact is deleted, rewritten, silently normalized, or replaced by this contract.

## 9. Next STEP

STEP 560 — V4 Production Implementation.
