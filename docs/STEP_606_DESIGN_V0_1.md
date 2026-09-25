# STEP 606 — Design V0.1: Production Authority Lifecycle Failure-Atomicity

## 1. Design Purpose

Define the smallest repository-grounded Design boundary required to close the STEP 606 Analysis gap: failure-atomicity across the existing production-authority lifecycle database durability boundary and the separate BlockCursor state-file durability boundary.

This Design does not activate V4 production authority and does not authorize implementation by itself.

## 2. Repository Baseline

- Analysis/reconciliation merge: `040435999be5892bd900feb8e31fe02a0a5934b4`
- Contract: `docs/STEP_606_PRODUCTION_AUTHORITY_LIFECYCLE_FAILURE_ATOMICITY_CONTRACT_V0_1.md`
- Analysis: `docs/STEP_606_ANALYSIS_V0_1.md`
- Lifecycle implementation: `src/core/production-authority-lifecycle.js`
- Ingestion boundary: `src/core/ingestion.js`
- Cursor persistence: `src/core/block-cursor.js` and `src/core/state.js`
- V4 production authority: INACTIVE / BLOCKED
- Gate 2: PASS

## 3. Proven Existing Semantics

The current runtime ordering is:

1. processing context is produced;
2. final authority gate is evaluated;
3. cursor advancement is attempted.

Lifecycle establishment independently performs preparation, writer-fence checks, deterministic lifecycle identity derivation, database persistence, save, readback, and complete record validation.

The lifecycle database and cursor state file are distinct durable stores. This separation is the material failure-atomicity boundary.

## 4. Design Invariants

The Design MUST preserve:

- frozen lifecycle schema;
- deterministic lifecycle identity and establishment input digest;
- existing authority binding;
- expected-authority versus production-authority separation;
- existing cursor semantics and regression protection;
- existing writer-fence ownership;
- raw/canonical evidence immutability;
- historical evidence and lineage;
- existing reorg predecessor semantics;
- fail-closed behavior;
- Surveillance as derived, evidence-linked, versioned, non-authoritative;
- ADDRESS != ACTOR;
- no temporal leakage;
- no automated action/trading;
- no predictive/ranking authority.

The Design MUST NOT introduce:

- cursor reset;
- historical rewrite/deletion;
- silent normalization;
- a second writer/lock;
- fallback/default authority;
- a new authority source;
- automated recovery that mutates evidence;
- production V4 activation.

## 5. Failure-Atomicity Model

The Design treats the existing two durable stores as a coordinated boundary without assuming they can become one physical transaction.

### State A — Prepared, not durable

Lifecycle preparation has validated context, expected authority, binding, lineage, predecessor, writer ownership, and deterministic identity.

Required outcome:
- no cursor advancement;
- no claim of durable production authority.

### State B — Lifecycle durable, cursor not yet durable

This is the critical crash window identified by Analysis.

Required invariant:
- lifecycle evidence remains immutable and must not be deleted or rewritten;
- cursor must not be reset or artificially advanced;
- restart must detect/reconcile the durable lifecycle state against the persisted cursor and exact processing identity;
- ambiguity or conflict is FAIL-CLOSED.

### State C — Lifecycle durable and cursor durable

This is the intended successful boundary.

Required invariant:
- cursor points only to the successfully authorized range;
- lifecycle record remains exactly matched to processing context, expected authority, binding, lineage, and predecessor;
- replay is idempotent.

### State D — Cursor failure after lifecycle durability

A cursor persistence error MUST NOT cause deletion of the durable lifecycle record and MUST NOT cause cursor reset.

The recovery contract must preserve the durable lifecycle evidence and establish a deterministic STOP/FAIL-CLOSED state until reconciliation is proven.

## 6. Commit Ordering

The Design preserves the existing logical ordering:

Prepare → Final Authority Validation → Lifecycle Durable Commit → Cursor Durable Advance → Completion Verification.

No cursor advance may occur before final authority validation.

Lifecycle durable commit must complete its existing readback/provenance validation before cursor advancement is considered successful.

The Design does not claim that the two stores are physically atomic.

## 7. Crash/Restart Test Matrix

The implementation/test phase MUST provide deterministic evidence for at least:

| Scenario | Expected result |
|---|---|
| authority rejection before lifecycle commit | lifecycle absent; cursor unchanged |
| lifecycle preparation failure | no lifecycle commit; cursor unchanged |
| lifecycle durable commit succeeds, cursor advance succeeds | both durable; replay idempotent |
| lifecycle durable commit succeeds, cursor persistence fails | lifecycle preserved; cursor not reset; fail-closed/reconciliation state |
| process crash immediately after lifecycle durability | restart detects lifecycle-ahead-of-cursor condition deterministically |
| restart after successful lifecycle + cursor durability | no duplicate lifecycle; no cursor regression |
| reorg replacement with durable predecessor | predecessor linkage preserved |
| crash during reorg replacement boundary | no lineage deletion/reset; deterministic fail-closed handling |
| concurrent writer loses fence | no unauthorized lifecycle/cursor advancement |
| concurrent/replay attempt for same lifecycle identity | existing durable record validated, not normalized |
| conflicting lifecycle identity on replay | reject/fail-closed |
| cursor regression after restart | existing regression protection remains active |

## 8. Recovery/Reconciliation Semantics

The implementation must not invent recovery semantics outside this Design.

The repository-grounded target is:

1. detect whether lifecycle evidence exists for the exact processing identity/range;
2. compare lifecycle provenance and binding against the current processing context and expected authority;
3. compare the durable cursor with the lifecycle range;
4. if all required identities and commitments match, permit only the already-contractual forward completion path;
5. if evidence conflicts, is ambiguous, incomplete, or cannot be verified, STOP/FAIL-CLOSED;
6. never delete lifecycle evidence to make cursor state appear consistent;
7. never reset cursor state to hide a crash boundary.

Exact operator-facing commands remain out of scope until the repository provides a supported interface.

## 9. Reorg/Replacements

For `REORG_REPLACEMENT`:

- exactly one durable predecessor remains required;
- predecessor lifecycle identity remains immutable;
- replacement lineage must be validated before durable commitment;
- crash/restart must preserve both predecessor and replacement evidence;
- ambiguous predecessor or conflicting lineage is FAIL-CLOSED;
- no historical deletion or rewrite is permitted.

## 10. Concurrency / Writer Fence

The existing writer fence remains the sole ownership boundary.

Tests must exercise:
- ownership present at preparation;
- ownership present before lifecycle write;
- ownership present after lifecycle persistence/readback;
- ownership loss;
- replay under an existing durable lifecycle identity.

The Design does not add another lock or writer.

## 11. Operator Acceptance

Operator acceptance is limited to repository-defined observable behavior.

The resulting implementation must make it possible to determine, from existing supported status/evidence surfaces:

- whether lifecycle preparation succeeded;
- whether lifecycle durability was established;
- whether cursor durability was established;
- whether the system is in a crash/uncertain boundary;
- whether STOP/FAIL-CLOSED is required;
- whether replay/reconciliation is verified.

No undocumented command is introduced by this Design.

## 12. Surveillance Boundary

Surveillance remains strictly derived.

Any implementation/test introduced under this Design:
- cannot mutate raw/canonical evidence;
- cannot advance the cursor;
- cannot create production authority;
- cannot perform automated action/trading;
- cannot infer actor ownership from an address;
- must preserve temporal ordering;
- must not introduce scoring/risk authority before its own contract, validation, uncertainty, and evidence requirements exist.

## 13. Acceptance Criteria for Design

Design is acceptable only if:

- the cross-store crash boundary is explicit;
- durable lifecycle-ahead-of-cursor behavior is explicitly defined as a fail-closed reconciliation condition, not silently repaired;
- crash/restart/reorg/concurrency test requirements are concrete;
- existing schema/identity/binding/cursor/writer-fence semantics remain unchanged;
- Operator Acceptance is repository-grounded;
- Surveillance remains non-authoritative;
- no production implementation or V4 activation is authorized by Design alone.

## 14. Next Phase

After Design acceptance and its required lifecycle, the next phase is Code.

Code must implement only this Design boundary. Any semantic change outside this boundary requires a new Contract.
