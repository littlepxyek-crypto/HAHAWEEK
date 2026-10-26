# STEP 603 — Production Authority Establishment Source Design v0.1

- Phase: DESIGN
- Analysis commit: `8f89b8fc29a45ddc9b9456df17c8a6d5092213c3`
- Gate 2: PASS
- V4 production authority: INACTIVE / BLOCKED

## 1. Schema

Add one append-only table, `production_authority_lifecycle`, through schema migration 7→8.

Columns:
- `authority_lifecycle_id TEXT PRIMARY KEY`
- `state TEXT NOT NULL`
- `segment_id TEXT NOT NULL`
- `manifest_digest TEXT NOT NULL`
- `checkpoint_digest TEXT NOT NULL`
- `generation TEXT NOT NULL`
- `cursor_block INTEGER NOT NULL`
- `binding_digest TEXT NOT NULL`
- `processing_result_id TEXT NOT NULL`
- `processing_execution_id TEXT NOT NULL`
- `lineage_id TEXT NOT NULL`
- `canonical_decision_snapshot_id TEXT NOT NULL`
- `evidence_set_digest TEXT NOT NULL`
- `from_block INTEGER NOT NULL`
- `to_block INTEGER NOT NULL`
- `expected_segment_id TEXT NOT NULL`
- `expected_manifest_digest TEXT NOT NULL`
- `expected_checkpoint_digest TEXT NOT NULL`
- `source_id TEXT NOT NULL`
- `predecessor_lifecycle_id TEXT NULL`
- `replacement_type TEXT NULL`
- `establishment_input_digest TEXT NOT NULL`
- `committed_at TEXT NOT NULL`

Allowed state: `DURABLY_ESTABLISHED` only for persisted rows. Candidate state is an in-memory validation phase and is never authoritative.

The table is append-only with UPDATE/DELETE triggers. No foreign key is added to frozen F-03 tables because lifecycle ownership must remain distinct.

## 2. Identity

Use domain:
`HAHAWEEK-EVIDENCE-V4-PRODUCTION-AUTHORITY-LIFECYCLE`

Canonical establishment input contains:
- version;
- source_id;
- exact range;
- generation;
- cursor endpoint;
- processing result/execution identity;
- lineage identity;
- canonical decision snapshot identity;
- evidence-set digest;
- expected segment/manifest/checkpoint commitments;
- production segment/manifest/checkpoint commitments;
- binding digest;
- predecessor identity;
- replacement type.

SHA-256 over domain + NUL + canonical input produces `authorityLifecycleId` and `establishmentInputDigest`.

No time/randomness/cursor-alone/Surveillance data participates in identity.

## 3. Establishment adapter

Create `src/core/production-authority-lifecycle.js`.

The adapter receives:
- database;
- writerFence;
- processingContext;
- expectedAuthority.

It:
1. asserts writer ownership;
2. validates VERIFIED context and exact range;
3. validates expected authority;
4. constructs the frozen production-authority commitment from expected authority;
5. computes existing binding digest;
6. validates the resulting production authority;
7. derives lifecycle identity;
8. reads any existing lifecycle identity;
9. returns identical durable record on exact match;
10. rejects conflicting identity/content;
11. inserts the immutable lifecycle row;
12. calls existing database.save();
13. re-reads and validates the durable row;
14. returns the frozen production-authority record.

The adapter never advances the cursor.

## 4. Runtime integration

In `src/index.js`, the default production authority factory becomes the lifecycle establishment adapter. The explicit `authorityFactory` injection remains supported for tests and compatibility, but the runtime default is repository-owned.

The factory receives the processing context from the authority gate. Therefore the authority gate must invoke the factory with:
`fromBlock`, `toBlock`, and `processingContext`.

The existing expected-authority factory remains separate.

## 5. Recovery/reorg

On restart, identical lifecycle identity is reused after durable re-read and validation.

For a new canonical generation, the processing context's transition and parent lineage determine whether a replacement is legitimate. The adapter creates a new immutable lifecycle row with predecessor linkage.

No update/delete of prior lifecycle rows.

## 6. Atomicity

The database snapshot already exists at the processing-context boundary. The lifecycle adapter must snapshot before insert and restore if persistence/re-read validation fails before durable save.

After save, the lifecycle row must be re-read from the in-memory database and validated before the authority factory returns.

A failed save or validation throws; the authority gate does not return and cursor cannot advance.

## 7. Operator Acceptance

Provide read-only functions:
- `readProductionAuthorityLifecycle(database, id)`
- `listProductionAuthorityLifecycles(database, range)`

These return deterministic evidence suitable for a later operator command/documentation phase.

## 8. Surveillance

No Surveillance dependency. No scoring, risk, actor inference, automated action, or authority creation from analytical output.

## 9. Test design

Required:
- schema v7→v8 upgrade and fresh v8 creation;
- lifecycle establishment;
- exact idempotent restart;
- conflicting same-identity content;
- writer-fence failure;
- non-VERIFIED context;
- expected-authority mismatch;
- binding mismatch;
- reorg replacement with immutable predecessor;
- corrupted lifecycle row;
- failed save;
- cursor unchanged when establishment fails;
- existing F-03 regression suite;
- explicit factory compatibility.

## 10. Security/Regression

Must prove no raw/canonical evidence mutation, no cursor movement by lifecycle source, no F-03 representation change, no second writer/lock, no Surveillance path, and no fallback to expected authority.

Proceed to Code.
