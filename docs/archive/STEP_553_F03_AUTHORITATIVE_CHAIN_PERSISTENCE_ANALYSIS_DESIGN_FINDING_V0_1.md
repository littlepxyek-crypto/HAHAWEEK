# STEP 553 — F-03 Authoritative Chain Persistence Analysis/Design Finding v0.1

Status: ANALYSIS/DESIGN
Step: 553
Baseline: STEP 552 merged on `main`

## 1. Purpose

Translate the STEP 552 durable authoritative-chain contract into a repository-grounded implementation design without changing production behavior.

The required chain is:

`verified segment -> verified manifest -> verified checkpoint`

This STEP does not activate V4, does not close F-03, and does not declare Design Gate 2 PASS.

## 2. Repository evidence

The current `src/core/database.js` persists these SQLite tables:

- `schema_meta`
- `raw_events`
- `pools`
- `liquidity_events`
- `flow_windows`
- `ingestion_state`
- `canonical_evidence`

The current database schema version is recorded as `3`.

The current `src/core/state.js` persists runtime/cursor state separately in the state file.

The current F-03 runtime boundary already validates the submitted authority, expected authority, cryptographic binding, checkpoint-before-cursor ordering, and writer controls, but there is no durable segment/manifest/checkpoint record set from which the expected authority can be independently read.

Therefore an adapter around the existing `expectedAuthorityFactory` cannot satisfy STEP 552.

## 3. Persistence decision

### Decision

Use the existing SQLite database as the durable persistence mechanism, but add a dedicated authoritative-chain record set.

### Justification

The existing tables cannot represent the required chain without ambiguity:

1. `raw_events` identifies captured chain logs, not verified segment artifacts.
2. `canonical_evidence` identifies canonical evidence, but has no manifest/checkpoint commitment model or generation-linked authoritative chain.
3. `ingestion_state` is mutable runtime state and is not an immutable authority artifact.
4. `state.json` is cursor/runtime state and cannot establish segment/manifest/checkpoint provenance.
5. Existing F-03 authority records are runtime validation objects, not durable persisted artifacts.

Reusing any of those structures as the authoritative chain would conflate evidence/runtime state with protocol commitments and would violate the explicit linkage requirement.

A separate authoritative-chain table set is therefore justified.

This design does NOT authorize the migration itself. The schema change requires a separately reviewed implementation contract before production code is changed.

## 4. Proposed schema

The implementation contract should introduce three dedicated SQLite tables.

### 4.1 `f03_segments`

Required columns:

- `segment_id TEXT PRIMARY KEY`
- `from_block INTEGER NOT NULL`
- `to_block INTEGER NOT NULL`
- `segment_digest TEXT NOT NULL`
- `generation TEXT NOT NULL`
- `provenance_json TEXT NOT NULL`
- `committed_at TEXT NOT NULL`

Required constraints:

- exact integer range;
- `from_block <= to_block`;
- immutable identity;
- deterministic digest representation;
- mandatory provenance;
- uniqueness of `segment_id`;
- unique tuple `(segment_id, segment_digest)` for composite linkage;
- malformed/incomplete records rejected by the application validation boundary.

### 4.2 `f03_manifests`

Required columns:

- `manifest_id TEXT PRIMARY KEY`
- `manifest_digest TEXT NOT NULL`
- `generation TEXT NOT NULL`
- `segment_id TEXT NOT NULL`
- `segment_digest TEXT NOT NULL`
- `provenance_json TEXT NOT NULL`
- `committed_at TEXT NOT NULL`

Required constraints:

- immutable manifest identity;
- unique `manifest_id`;
- unique tuple `(segment_id, segment_digest)` as a valid foreign-key target;
- foreign-key reference to the exact persisted segment identity/digest;
- generation continuity validation;
- no range-only linkage;
- mandatory provenance.

### 4.3 `f03_checkpoints`

Required columns:

- `checkpoint_digest TEXT PRIMARY KEY`
- `generation TEXT NOT NULL`
- `manifest_id TEXT NOT NULL`
- `manifest_digest TEXT NOT NULL`
- `provenance_json TEXT NOT NULL`
- `committed_at TEXT NOT NULL`

Required constraints:

- immutable checkpoint identity;
- exact checkpoint digest;
- unique checkpoint digest;
- foreign-key reference to the exact persisted manifest identity/digest;
- checkpoint generation equals manifest generation;
- mandatory provenance.

The frozen normative checkpoint input remains authoritative. Its exact input is represented by the frozen fields `generation` and `manifest_hash`; the checkpoint digest is independently recomputable from those values under the frozen domain/JCS rules. No new checkpoint normalization is introduced.

## 5. Explicit linkage model

The implementation must verify the following independently:

`f03_segments(segment_id, segment_digest)`
→ `f03_manifests(manifest_id, manifest_digest)`
→ `f03_checkpoints(checkpoint_digest)`

The linkage MUST NOT be inferred from:

- matching block ranges;
- matching timestamps;
- matching generation alone;
- submitted live authority;
- cursor state.

Every referenced identity and digest must resolve to exactly one persisted record.

Zero or multiple candidates fail closed.

## 6. Provenance model

`provenance_json` is persisted as immutable evidence, not reconstructed on read.

The implementation contract should define a canonical provenance object containing at least:

- persistent record identity;
- persistence mechanism = SQLite;
- table/key;
- artifact identity;
- exact range where applicable;
- upstream record identity;
- commit timestamp;
- generation;
- integrity digest.

The application boundary must reject missing, malformed, or identity-conflicting provenance.

Changing provenance for an existing immutable identity is an integrity conflict.

## 7. Identity and collision behavior

The implementation must provide explicit classification:

- same identity + same verified content/digest → IDEMPOTENT;
- same identity + different content/digest → INTEGRITY_CONFLICT;
- zero candidates → NOT_FOUND/fail closed;
- multiple candidates → AMBIGUOUS/fail closed.

The implementation must not use:

- `INSERT OR IGNORE`;
- overwrite;
- replacement;
- latest-wins;
- normalization;
- regeneration.

## 8. Atomic persistence design

A complete chain commit must be one SQLite transaction covering all required segment, manifest, and checkpoint rows.

Required sequence:

1. validate all records and cross-record linkage before mutation;
2. acquire the existing writer fence;
3. begin a SQLite write transaction;
4. insert or classify the segment;
5. insert or classify the manifest;
6. insert or classify the checkpoint;
7. verify all foreign-key/linkage/generation constraints;
8. commit the SQLite transaction;
9. durably export the database through the existing atomic database-save boundary;
10. only after durable persistence succeeds may the chain commit be reported authoritative.

A failed transaction must roll back.

A failed durable export must not be reported as an authoritative successful commit.

Cursor advancement remains outside this persistence operation and remains later than authority validation/binding.

The implementation contract must include explicit handling/tests for interruption between transaction and durable export so an in-memory-only chain cannot be treated as durable authority after restart.

## 9. Read boundary

The STEP 550 expected-authority reader should read only from these durable chain records.

The reader must:

- be side-effect-free;
- perform SELECT-only operations;
- never write/repair/normalize;
- require exact `fromBlock/toBlock`;
- resolve exactly one chain;
- independently verify every linkage;
- independently verify digests;
- validate generation;
- retain provenance in the returned authority evidence;
- never accept submitted authority as an input.

The reader must not modify cursor, raw evidence, canonical evidence, segment, manifest, or checkpoint state.

## 10. Schema-version handling

Current schema version is `3`.

Adding the dedicated chain tables is a schema migration and therefore requires a separate implementation contract.

That contract must define:

- schema version transition;
- fresh database creation;
- existing database upgrade;
- backward-compatible startup behavior;
- transaction boundaries;
- failure/rollback behavior;
- whether foreign keys are enabled during migration;
- preservation of all existing rows;
- no historical rewrite;
- no silent normalization.

If upgrade behavior cannot preserve existing state exactly, implementation must stop and create a dedicated migration contract rather than silently transform data.

## 11. Concurrency design

The existing single-writer fence remains authoritative.

Within the writer boundary:

- identical concurrent commits may converge idempotently;
- conflicting identities fail closed;
- no writer replaces another writer's immutable record;
- readers cannot observe a partially committed chain;
- the authority chain is not published to the expected-authority reader until durable persistence succeeds.

Concurrency tests must exercise both identical and conflicting writers.

## 12. Failure matrix to implement

The implementation contract must map these cases to deterministic fail-closed outcomes:

- missing segment;
- missing manifest;
- missing checkpoint;
- malformed/incomplete record;
- missing provenance;
- invalid range;
- wrong range;
- invalid segment digest;
- invalid manifest digest;
- invalid checkpoint digest;
- invalid segment→manifest linkage;
- invalid manifest→checkpoint linkage;
- generation mismatch;
- stale chain;
- ambiguous candidate;
- identity collision;
- partial transaction;
- failed durable export;
- restart after interruption;
- read-path mutation attempt;
- submitted-authority manufacture attempt;
- submitted-authority mismatch;
- checkpoint-not-committed;
- cursor-before-authority attempt.

No failure may downgrade to `UNGUARDED`.

## 13. Test design

The implementation contract must provide executable coverage for:

### Positive

- valid complete chain;
- exact-range lookup;
- deterministic repeated read;
- restart persistence;
- idempotent identical commit;
- valid provenance;
- valid generation continuity;
- independent digest/linkage verification.

### Negative

- all failure-matrix cases in section 12;
- read-path nonmutation;
- conflicting concurrent writer;
- interruption/partial persistence;
- cursor unchanged after failed chain commit.

Existing tests and golden vectors remain unchanged unless an actual test defect is proven.

## 14. Security/regression boundary

The implementation must preserve:

- F-03 cryptographic authority binding;
- checkpoint-before-cursor;
- legacy write barrier;
- writer fencing;
- raw/canonical evidence integrity;
- recovery behavior;
- reorg-aware historical evidence;
- frozen normative checkpoint contract;
- existing golden vectors.

No V4 production authority activation is part of this design.

## 15. Scope boundary

In scope for the next implementation contract:

- dedicated SQLite chain tables;
- schema/version migration behavior;
- atomic chain persistence;
- deterministic read;
- exact linkage;
- provenance;
- collision handling;
- restart/crash behavior;
- concurrency tests;
- integration boundary for STEP 550.

Out of scope:

- RPC/provider redesign;
- cursor reset/migration;
- historical rewrite;
- replacement of the existing authority gate;
- V4 production activation;
- Design Gate 2 PASS.

Those remain prohibited until independently contracted and verified.

## 16. Gate status

F-03 remains CONDITIONAL.

Design Gate 2 remains NOT PASSED.

V4 production authority remains inactive.

No production code is changed in STEP 553 because the required schema/migration semantics need a separately reviewed implementation contract.

## 17. Required next STEP

STEP 554 must define the implementation contract for the dedicated SQLite authoritative-chain persistence, including exact DDL/schema migration, transactional API, read API, identity/conflict semantics, durability boundary, and executable test matrix.

## 18. Traceability

STEP 550 persistence contract
→ STEP 551 repository finding
→ STEP 552 authoritative-chain contract
→ STEP 553 repository-grounded analysis/design
→ STEP 554 implementation contract
→ code
→ test
→ security/regression
→ CI
→ review
→ merge
→ post-merge verification
→ reconciliation
→ documentation.
