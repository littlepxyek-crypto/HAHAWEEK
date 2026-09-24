# STEP 550 — F-03 Durable Checkpoint/Authority Persistence Boundary Contract v0.1

Status: CONTRACT DEFINITION
Step: 550
Baseline: STEP 549 reconciled on `main`

## 1. Purpose

Define the minimal durable persistence boundary required before STEP 549 can implement a durable expected-authority source.

This contract closes the repository prerequisite identified by STEP 549 analysis. It does not itself activate V4 production authority or declare Design Gate 2 PASS.

## 2. Problem

The current repository persists raw/canonical evidence and cursor state, but does not persist one authoritative production record containing the complete F-03 commitment and its provenance for an exact processed range.

The existing `expectedAuthorityFactory` therefore cannot yet be replaced by a repository-grounded durable reader without manufacturing authority.

## 3. Required durable record

A durable F-03 authority record MUST contain, without silent derivation or repair:

- `fromBlock`
- `toBlock`
- `segmentId`
- `manifestDigest`
- `checkpointDigest`
- `generation`
- `cursorBlock`
- durable provenance identifying the storage record and persistence location/identity
- explicit linkage proving:
  `segment -> manifest -> checkpoint`

The exact record schema MUST be documented before implementation and MUST reject unknown/missing integrity-critical fields where the schema is exact.

## 4. Persistence boundary

The record MUST be stored in an actual existing durable persistence mechanism where feasible.

A new persistence table/file is permitted only when the repository's existing persistence cannot represent the required authoritative record without ambiguity, and the implementation must justify why.

The persistence boundary MUST provide:

1. atomic durable write;
2. deterministic read;
3. exact range lookup;
4. uniqueness for an authoritative range/identity;
5. integrity-conflict detection;
6. restart persistence;
7. provenance retention;
8. no replacement of conflicting historical authority;
9. fail-closed behavior for corruption or ambiguity.

No SQLite schema migration is authorized by this contract by itself; implementation must establish whether an existing representation is sufficient before changing schema.

## 5. Chain linkage

The durable record is authoritative only if all linkage references can be independently verified:

```
verified segment
      ↓
verified manifest
      ↓
verified checkpoint
      ↓
durable authority record
      ↓
cursor boundary
```

A record with a valid local digest but unverifiable upstream linkage MUST NOT become authoritative.

The implementation MUST NOT infer linkage merely from matching block ranges.

## 6. Range semantics

`fromBlock` and `toBlock` MUST be exact non-negative integers with:

- `fromBlock <= toBlock`;
- no coercion;
- no alternate range encoding;
- no wildcard/latest semantics.

A lookup returning zero records MUST fail closed.

A lookup returning multiple authoritative candidates MUST fail closed.

A matching record outside the requested range MUST never be silently substituted.

## 7. Cursor ordering

The persistence boundary MUST preserve:

```
evidence → manifest → checkpoint → authority record → authority validation → cursor
```

Cursor advancement MUST remain impossible before checkpoint and authority validation.

The durable reader itself MUST be read-only with respect to cursor/evidence/checkpoint/manifest state.

## 8. Authority separation

The durable record MUST be written from committed persisted evidence/checkpoint state, not from the submitted live authority.

The submitted authority MUST NOT be an input from which the durable expected commitment can be constructed.

Any conflict between submitted authority and durable record MUST be classified as a binding failure, not repaired.

## 9. Integrity and collision policy

For identical durable authority identity:

- identical content and integrity digest → idempotent;
- different content/digest → `INTEGRITY_CONFLICT`;
- malformed/corrupt record → fail closed.

No `INSERT OR IGNORE`, silent replacement, normalization, or regeneration may conceal an integrity conflict.

## 10. Provenance

Every durable authoritative record MUST preserve enough provenance to answer:

- which persistent record is authoritative;
- where it is stored;
- which committed checkpoint it references;
- which manifest/segment chain it references;
- when it was committed;
- which exact range it covers.

Provenance must be immutable for the identity of the authoritative record.

## 11. Required negative cases

Implementation tests MUST cover:

- missing record;
- wrong range;
- incomplete field;
- malformed field;
- missing provenance;
- missing checkpoint linkage;
- invalid segment linkage;
- invalid manifest linkage;
- ambiguous multiple records;
- stale record;
- integrity conflict;
- restart/reload;
- deterministic repeated reads;
- read-path nonmutation;
- submitted authority attempting to manufacture expected authority;
- submitted authority differing from durable authority;
- checkpoint-not-committed;
- cursor advance attempted before authority validation.

## 12. Historical preservation

Implementation MUST NOT:

- rewrite historical evidence;
- delete evidence;
- reset cursor;
- rewrite existing golden vectors;
- mutate frozen contracts;
- silently migrate old authority records;
- silently normalize malformed historical records.

Any migration requirement discovered during implementation MUST become a separately reviewed contract/STEP.

## 13. V4 boundary

This contract does not:

- activate V4 production authority;
- replace the existing authority gate;
- change RPC/provider semantics;
- declare Design Gate 2 PASS.

F-03 remains CONDITIONAL until the durable record, independent linkage verification, expected-source integration, tests, CI, merge, post-merge verification, and reconciliation are all demonstrated.

## 14. Traceability

Requirement → STEP 549 Implementation Contract → STEP 550 Persistence Contract → Analysis → Design → Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation → Documentation.
