# STEP 554 — F-03 Dedicated SQLite Authoritative-Chain Persistence Implementation Contract v0.1

Status: IMPLEMENTATION CONTRACT
Step: 554
Baseline: STEP 553 reconciled on `main`

## 1. Purpose

Define the exact implementation boundary for the durable F-03 authoritative chain required by STEP 552 and designed in STEP 553.

Required chain:

`verified segment -> verified manifest -> verified checkpoint`

This contract authorizes implementation of the dedicated SQLite persistence boundary and its migration/test surface.

It does NOT activate V4 production authority, replace the existing authority gate, migrate cursor state, or declare Design Gate 2 PASS.

## 2. Repository baseline

Verified on `main`:

- SQLite persistence is implemented in `src/core/database.js`.
- Current schema version is `3`.
- Existing tables include `schema_meta`, `raw_events`, `pools`, `liquidity_events`, `flow_windows`, `ingestion_state`, and `canonical_evidence`.
- `state.js` remains a separate runtime/cursor persistence boundary.
- Existing database saving exports SQLite and atomically replaces the database file through temporary-file + rename.
- The existing legacy write barrier must remain enforced.
- STEP 553 established that existing tables cannot represent the authoritative chain without ambiguity.

## 3. Authorized schema transition

The authoritative-chain implementation will introduce SQLite schema version `4`.

The transition is:

`schema_version = 3 -> schema_version = 4`

Fresh databases MUST be created directly with schema version `4`.

Existing schema-version-`3` databases MUST be upgraded in place without rewriting, deleting, normalizing, or replacing existing application rows.

No other schema migration is authorized by this STEP.

Unknown schema versions MUST fail closed rather than being downgraded, upgraded heuristically, or normalized.

## 4. Exact DDL

The implementation MUST create these tables.

### 4.1 f03_segments

```sql
CREATE TABLE f03_segments (
  segment_id TEXT PRIMARY KEY,
  from_block INTEGER NOT NULL,
  to_block INTEGER NOT NULL,
  segment_digest TEXT NOT NULL,
  generation TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  committed_at TEXT NOT NULL,
  CHECK (from_block >= 0),
  CHECK (to_block >= 0),
  CHECK (from_block <= to_block),
  UNIQUE (segment_id, segment_digest)
);
```

### 4.2 f03_manifests

```sql
CREATE TABLE f03_manifests (
  manifest_id TEXT PRIMARY KEY,
  manifest_digest TEXT NOT NULL,
  generation TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  segment_digest TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  committed_at TEXT NOT NULL,
  UNIQUE (manifest_id, manifest_digest),
  FOREIGN KEY (segment_id, segment_digest)
    REFERENCES f03_segments(segment_id, segment_digest)
);
```

### 4.3 f03_checkpoints

```sql
CREATE TABLE f03_checkpoints (
  checkpoint_digest TEXT PRIMARY KEY,
  generation TEXT NOT NULL,
  manifest_id TEXT NOT NULL,
  manifest_digest TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  committed_at TEXT NOT NULL,
  FOREIGN KEY (manifest_id, manifest_digest)
    REFERENCES f03_manifests(manifest_id, manifest_digest)
);
```

SQLite foreign-key enforcement MUST remain enabled.

The database MUST reject a manifest that references a segment identity with a different digest, and MUST reject a checkpoint that references a manifest identity with a different digest.

The schema does not use block-range columns on manifests/checkpoints because range matching is not linkage.

## 5. Record validation

Application validation MUST occur before any authoritative write.

### Segment

Required:

- non-empty immutable `segmentId`;
- exact non-negative integer `fromBlock`;
- exact non-negative integer `toBlock`;
- `fromBlock <= toBlock`;
- valid canonical `segmentDigest`;
- valid V4 generation;
- valid immutable provenance;
- valid timestamp.

### Manifest

Required:

- non-empty immutable `manifestId`;
- valid canonical `manifestDigest`;
- valid V4 generation;
- exact segment identity;
- exact segment digest;
- valid immutable provenance;
- valid timestamp.

### Checkpoint

Required:

- valid checkpoint digest;
- valid V4 generation;
- exact manifest identity;
- exact manifest digest;
- valid immutable provenance;
- valid timestamp;
- checkpoint digest independently recomputable under the frozen normative checkpoint contract.

The implementation MUST NOT coerce, default, normalize, or silently repair invalid values.

## 6. Generation validation

Generation is an integrity coordinate.

The implementation MUST verify:

- segment generation is valid;
- manifest generation equals the referenced segment generation;
- checkpoint generation equals the referenced manifest generation;
- generation representation remains compatible with the frozen V4 generation contract.

A mismatch fails closed.

Generation alone never proves linkage.

## 7. Provenance

Provenance is persisted as immutable JSON evidence.

The canonical provenance object MUST contain:

- `recordType`;
- `recordId`;
- `persistenceMechanism` = `sqlite`;
- `table`;
- `key`;
- `artifactId`;
- `upstreamRecordId` where applicable;
- exact `fromBlock`/`toBlock` for segment provenance;
- `generation`;
- `integrityDigest`;
- `committedAt`.

The implementation MUST validate that provenance identity agrees with the row being committed.

Provenance is not reconstructed from submitted authority.

Existing immutable identity + different provenance MUST produce `INTEGRITY_CONFLICT`.

## 8. Identity and collision API

The persistence layer MUST expose deterministic classification:

- `COMMITTED` — new complete record;
- `IDEMPOTENT` — same identity and identical verified content;
- `INTEGRITY_CONFLICT` — same identity with any differing integrity-critical content;
- `NOT_FOUND` — required referenced record absent;
- `AMBIGUOUS` — more than one valid candidate;
- `INVALID` — malformed/incomplete input.

No implementation may use:

- `INSERT OR IGNORE`;
- overwrite;
- replacement;
- latest-wins;
- silent normalization;
- regeneration.

An identity collision MUST NOT modify the existing row.

## 9. Atomic chain commit API

Introduce a dedicated persistence operation equivalent to:

`commitF03AuthorityChain({ segment, manifest, checkpoint })`

The operation MUST:

1. validate all three records before mutation;
2. acquire the existing writer fence;
3. begin one SQLite transaction;
4. classify/insert the segment;
5. classify/insert the manifest;
6. classify/insert the checkpoint;
7. verify foreign-key linkage;
8. verify generation continuity;
9. verify all digests and provenance;
10. commit the SQLite transaction;
11. durably persist the SQLite database through the existing atomic save boundary;
12. return authoritative success only after durable save succeeds.

If any step before SQLite commit fails, the transaction MUST roll back.

If the durable export/save fails after SQLite commit, the operation MUST return failure and MUST NOT advance the cursor or publish the chain as durable authority.

A process restart after a failed export MUST load the previous durable file state; the unexported in-memory chain MUST not become authoritative.

The implementation MUST NOT advance the cursor inside this operation.

## 10. Idempotent chain behavior

A complete chain already persisted with identical content MUST be accepted as idempotent.

An identical retry MUST NOT create a second record.

If any identity-critical value differs, the operation MUST fail with `INTEGRITY_CONFLICT`.

A conflict in any one link MUST prevent publication of the entire chain.

## 11. Deterministic read API

Introduce a read-only operation equivalent to:

`readF03AuthorityChain({ fromBlock, toBlock })`

The read path MUST:

- use SELECT-only operations;
- validate exact integer range;
- resolve exactly one authoritative chain;
- verify segment→manifest linkage;
- verify manifest→checkpoint linkage;
- verify digests;
- verify generation;
- verify provenance;
- return the durable authority evidence required by STEP 550;
- perform no writes;
- perform no repairs;
- perform no normalization;
- perform no cursor mutation.

Zero or multiple candidates MUST fail closed.

The returned authority MUST originate exclusively from durable persisted records.

The submitted live authority MUST NOT be an input to the read operation.

## 12. Migration behavior

Schema migration from version 3 to 4 MUST be performed transactionally.

Required sequence:

1. open existing database;
2. verify schema version is exactly 3;
3. begin SQLite transaction;
4. create the three new tables;
5. update `schema_meta.schema_version` to `4`;
6. commit;
7. atomically export the resulting database.

Existing rows MUST remain byte/value-equivalent at the application level.

No existing row is copied, rewritten, deleted, normalized, or regenerated.

If any migration statement fails, SQLite MUST roll back and the schema version MUST remain 3 in the durable file.

If export fails, the previous durable file MUST remain authoritative.

If the durable file reports schema version 4 but one of the three required tables is missing or malformed, startup MUST fail closed.

If schema version is 4 and required tables already exist, startup MUST verify their structure and constraints rather than recreating or replacing them.

If schema version is lower than 3 or greater than 4, startup MUST fail closed.

Fresh database initialization MUST produce version 4 and all required tables.

## 13. Durability boundary

The authoritative state boundary is the durable SQLite file, not the in-memory sql.js database.

A chain is authoritative only after:

`SQLite transaction commit -> atomic database export -> successful durable file replacement`

Before successful durable export, no cursor advance and no expected-authority publication is permitted.

The existing temporary-file + rename mechanism remains the durability boundary.

No direct cursor/state-file write is added to chain persistence.

## 14. Concurrency and writer fencing

The existing legacy writer barrier/fence remains mandatory.

The implementation MUST ensure:

- concurrent identical commits are idempotent;
- concurrent conflicting commits fail closed;
- no writer replaces another immutable row;
- no reader observes a partial chain;
- failed writes do not unlock a path around the legacy write barrier.

Database transaction locking and existing writer fencing MUST work together; neither may be removed or weakened.

## 15. STEP 550 integration boundary

The durable expected-authority reader MUST consume `readF03AuthorityChain`.

The submitted live authority remains distinct.

The existing F-03 authority validation and cryptographic binding remain in force.

Required ordering remains:

`evidence -> chain persistence -> durable expected authority -> authority validation/binding -> cursor`

This STEP does not replace the authority gate or cursor implementation.

## 16. Required executable tests

### Migration

- fresh database creates schema 4;
- schema 3 upgrades to schema 4;
- existing rows preserved;
- failed migration rolls back;
- schema 4 missing required table fails closed;
- unsupported schema versions fail closed;
- repeated startup on schema 4 is deterministic and non-destructive.

### Positive persistence

- valid complete chain commits;
- exact range reads;
- repeated reads are deterministic;
- restart preserves chain;
- identical retry is idempotent;
- provenance survives restart;
- generation continuity succeeds;
- independent digest/linkage verification succeeds.

### Negative persistence

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
- segment linkage mismatch;
- manifest linkage mismatch;
- generation mismatch;
- stale chain;
- ambiguous chain;
- identity collision;
- integrity conflict;
- failed transaction;
- failed durable export;
- restart after failed export;
- concurrent conflicting writers;
- read-path nonmutation;
- submitted authority manufacture attempt;
- submitted authority mismatch;
- checkpoint-not-committed;
- cursor-before-authority.

### Regression

All existing tests and golden vectors MUST remain passing. No test may be weakened to accommodate implementation behavior.

## 17. Security requirements

The implementation MUST preserve:

- F-03 cryptographic authority binding;
- checkpoint-before-cursor;
- legacy write barrier;
- writer fencing;
- raw/canonical evidence integrity;
- recovery;
- reorg evidence;
- frozen normative checkpoint contract;
- historical artifacts.

No silent fallback to `UNGUARDED` is permitted.

## 18. Failure handling

Every failure MUST identify its root cause and return a deterministic fail-closed result.

Required invariant:

**No durable authoritative chain → no durable expected authority → no authority binding success → no cursor advancement.**

The implementation MUST never repair a corrupt chain from submitted live authority.

## 19. Acceptance criteria

STEP 554 implementation contract is complete when:

1. exact schema/DDL is fixed;
2. schema transition 3→4 is fixed;
3. fresh and upgrade paths are fixed;
4. record validation is fixed;
5. provenance is fixed;
6. identity/collision behavior is fixed;
7. atomic persistence API is fixed;
8. deterministic read API is fixed;
9. durability boundary is fixed;
10. concurrency/writer fencing is fixed;
11. STEP 550 integration boundary is fixed;
12. migration tests are fixed;
13. persistence negative tests are fixed;
14. security/regression requirements are fixed;
15. historical preservation is fixed;
16. V4 remains inactive.

## 20. Explicit prohibitions

This STEP does NOT authorize:

- cursor reset;
- cursor migration;
- historical rewrite;
- deletion of evidence;
- replacement of frozen contracts;
- RPC/provider redesign;
- V4 activation;
- Design Gate 2 PASS;
- replacement of the existing authority gate;
- silent schema normalization.

## 21. Traceability

STEP 552 Contract
-> STEP 553 Analysis/Design
-> STEP 554 Implementation Contract
-> Code
-> Test
-> Security/Regression
-> CI
-> Review
-> Merge
-> Post-Merge Verification
-> Reconciliation
-> Documentation
-> Next STEP.
