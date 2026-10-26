# STEP 605 — V4 Production Authority Activation Readiness Hardening Design v0.1

- Phase: DESIGN
- Predecessor: STEP 605 Analysis
- Baseline: `e0316c3616cb4425f47c0d2d898f0ba16f41396c`
- Gate 2: PASS
- V4 production authority: INACTIVE / BLOCKED

## 1. Purpose

Define the smallest implementation-safe boundary required to prove activation readiness without activating V4 and without changing frozen lifecycle schema, lifecycle identity formula, authority binding formula, cursor ownership, writer-fence ownership, raw/canonical evidence, or Surveillance authority.

This Design addresses the Analysis findings only:

1. failure-atomicity across lifecycle establishment, final authority validation, and cursor advancement;
2. integrated crash/restart/reorg/concurrency evidence;
3. downstream authority rejection after lifecycle preparation;
4. operator acceptance constraints without inventing a new command.

## 2. Frozen boundaries

The following remain unchanged:

- lifecycle table schema/version and append-only semantics;
- `authorityLifecycleId` domain-separated identity formula;
- existing `createAuthorityBindingDigest` formula;
- expected-authority source and its distinctness from production authority;
- existing single writer-fence ownership;
- cursor owner and cursor advancement barrier;
- raw/canonical evidence;
- provider/RPC authority;
- historical evidence and artifacts;
- Surveillance authority boundary.

No V4 production activation is included.

## 3. Failure-atomicity design

### 3.1 Problem

The current path can durably persist a lifecycle record inside `establishProductionAuthorityLifecycle()` before the authority gate finishes its downstream `authorityValidator` and `authorityBindingValidator` calls.

The required acceptance property is:

> A batch must not advance the cursor unless the complete authority acceptance boundary succeeds, and a downstream rejection must leave only explicitly defined immutable evidence, never an ambiguous accepted-authority state.

### 3.2 Proposed boundary

Introduce a two-stage lifecycle operation at the integration boundary, without changing the persisted record:

**Prepare → Validate → Durable Commit → Cursor Advance**

1. **Prepare**
   - validate VERIFIED processing context;
   - validate exact range/generation/cursor;
   - obtain and validate the exact expected authority;
   - construct the production authority and binding using the existing frozen formula;
   - resolve reorg predecessor using the existing durable lifecycle relation;
   - compute the existing lifecycle identity/input digest;
   - produce an in-memory lifecycle candidate;
   - do not advance the cursor.

2. **Validate**
   - run the existing production-authority validator;
   - run the existing expected-vs-production binding validator;
   - re-check writer-fence ownership;
   - verify candidate provenance and commitment fields against the exact processing context and expected authority.

3. **Durable Commit**
   - persist exactly the already-defined lifecycle record;
   - call the existing database durability mechanism;
   - re-read and verify the persisted record;
   - if persistence or re-read verification fails, fail closed and do not advance the cursor.

4. **Cursor Advance**
   - only after durable lifecycle commit and final authority acceptance return successfully to the unchanged ingestion barrier;
   - call the existing cursor advancement exactly once.

This design intentionally moves the durable lifecycle write behind final authority validation. It does not introduce a second writer, transaction authority, cursor owner, or alternate authority source.

### 3.3 Failure semantics

- Prepare failure: no cursor movement; no lifecycle record is committed.
- Authority validation failure: no cursor movement; no new lifecycle record is committed by the current attempt.
- Persistence failure: no cursor movement; existing database failure/recovery semantics remain authoritative.
- Post-persistence verification failure: fail closed; cursor remains unchanged; the durable record is treated as evidence requiring reconciliation, not as permission to advance.
- Cursor failure after successful durable lifecycle commit: cursor remains authoritative and must not be reset; restart/reconciliation must observe the immutable lifecycle evidence.
- Reorg replacement failure: predecessor remains immutable; no replacement record is accepted as authority unless the complete validation/commit boundary succeeds.

The design therefore distinguishes **durable evidence existence** from **cursor acceptance**. It does not delete a lifecycle record to simulate rollback.

## 4. Reorg design

For `REORG_REPLACEMENT`:

- predecessor lookup remains by durable `processing_result_id`;
- exactly one predecessor remains required;
- replacement receives a new deterministic lifecycle identity;
- predecessor is never updated or deleted;
- interrupted replacement must not advance the cursor;
- restart must observe both immutable records if the replacement had already durably committed.

Integrated tests must cover:
- valid replacement;
- missing predecessor;
- ambiguous predecessor;
- rejection before durable commit;
- interruption after durable commit but before cursor advance;
- restart observation.

## 5. Concurrency and crash evidence design

The implementation boundary must retain the existing writer fence and test the runtime boundary, not merely isolated helper functions.

Required evidence scenarios:

1. concurrent ingestion attempts against one writer fence;
2. lifecycle preparation while ownership is lost;
3. downstream authority rejection;
4. persistence failure;
5. crash/interruption between durable lifecycle commit and cursor advance;
6. restart after interrupted acceptance;
7. reorg replacement with restart;
8. repeated identical establishment remains idempotent;
9. conflicting lifecycle content remains rejected;
10. cursor never advances past an unaccepted batch.

Tests must assert exact persisted lifecycle identities and cursor values before and after each failure/restart scenario.

## 6. Evidence and determinism

No new identity formula is permitted.

Tests must prove:

- identical establishment input produces the existing deterministic lifecycle identity;
- the persisted record matches the prepared candidate;
- expected commitments and production commitments remain distinct;
- evidence/provenance fields remain bound to the exact VERIFIED processing context;
- no raw/canonical evidence is rewritten or deleted;
- no historical record is normalized or replaced.

## 7. Operator Acceptance

This Design does not introduce a new operator command because the current Contract explicitly excludes inventing new operator commands/recovery procedures.

For this boundary, Operator Acceptance is therefore limited to repository-grounded evidence already emitted by the runtime and the durable lifecycle read/list capability already implemented in `production-authority-lifecycle.js`.

A dedicated operator-facing lifecycle command, if later required, is an explicit future Contract boundary and is out of scope here.

Acceptance evidence must show:

- processing status and exact range;
- authority outcome;
- cursor outcome;
- lifecycle identity/provenance in repository/test evidence;
- failure reason and fail-closed state;
- restart/recovery result without cursor reset.

## 8. Surveillance

Surveillance remains outside the authority path.

No Surveillance-derived signal may:

- create or validate production authority;
- advance the cursor;
- mutate raw/canonical evidence;
- infer actor/ownership;
- trigger automated action/trading;
- introduce scoring/ranking authority.

**ADDRESS != ACTOR.**

No Surveillance implementation is authorized by this Design.

## 9. Implementation boundary

The smallest safe Code boundary is limited to:

- refactor lifecycle establishment into preparation and durable-commit phases while preserving the existing persisted record and identity;
- integrate final authority validators before durable lifecycle commit;
- preserve the existing cursor barrier;
- add integrated failure/restart/reorg/concurrency tests;
- add only repository-grounded assertions required for the acceptance evidence.

No V4 activation flag, production cutover, deployment, new writer, new lock, schema change, identity change, binding change, cursor change, evidence rewrite, or Surveillance authority is permitted.

## 10. Acceptance criteria for Code/Test

Code may proceed only if all are demonstrable:

- lifecycle schema and identity are unchanged;
- final authority validation occurs before durable lifecycle acceptance;
- cursor advances only after durable lifecycle acceptance;
- downstream rejection leaves cursor unchanged;
- persistence failure leaves cursor unchanged;
- crash/restart preserves immutable lifecycle history;
- reorg predecessor/replacement relationship remains immutable;
- concurrent writer attempts fail closed;
- idempotence remains deterministic;
- existing regression/golden vectors remain green;
- no raw/canonical evidence is modified;
- V4 remains inactive.

## 11. Traceability

Requirement → STEP 605 Contract → STEP 605 Analysis → this Design → future Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation → Documentation.

This Design authorizes no implementation outside the listed boundary.

## 12. Decision

**DESIGN READY FOR CODE**, subject to the normal repository lifecycle and CI gates.

V4 production authority remains **INACTIVE / BLOCKED**.
