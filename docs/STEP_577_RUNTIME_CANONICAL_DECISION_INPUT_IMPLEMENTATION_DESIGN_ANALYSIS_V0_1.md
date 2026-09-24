# STEP 577 — Runtime Canonical Decision Input Implementation Design & Analysis v0.1

Status: DESIGN / ANALYSIS
Step: 577
Predecessor: STEP 576
Baseline: 435c2562cd0c83c096ecc1cb40133bad053b5aa3
Gate 2: PASS
V4 production activation: INACTIVE

## 1. Purpose

Translate the frozen STEP 576 Runtime Canonical Decision Input Contract into the smallest repository-compatible persistence/API design before production runtime code changes.

This document does not implement runtime canonical decision acquisition. It freezes implementation details required to make the next code stage deterministic, additive, fail-closed, restart-recoverable, branch-preserving, and compatible with the existing repository.

No existing historical evidence, STEP 563 semantics, STEP 568 semantics, cursor behavior, F-03 authority, or V4 activation is changed.

## 2. Repository inspection at the STEP 577 baseline

The actual baseline commit is `435c2562cd0c83c096ecc1cb40133bad053b5aa3`.

Relevant current surfaces:

- `src/core/rpc.js` creates an ethers v6 `JsonRpcProvider`, configured with the repository RPC URL, a fixed configured network, and batchMaxCount 1. It already exposes `getNetwork()` and `getBlockNumber()` through the provider.
- `src/core/confirmation.js` provides `getSafeHead(headBlock, confirmations)`.
- `src/core/raw-log-ingestion.js` acquires logs only; it does not establish canonical block lineage.
- `src/core/raw-event-store.js` preserves raw event block hashes when supplied and rejects digest conflicts.
- `src/core/canonical-evidence.js` projects immutable raw logs but does not establish block-branch canonicality.
- `src/core/evidence-identity.js` already provides canonical JCS UTF-8 serialization and domain-separated SHA-256 helpers.
- `src/core/single-writer-fence.js` provides fail-closed lease ownership and `assertOwned()`.
- `src/core/database.js` is schema version 5 and uses additive migrations with sql.js; existing F-03 and processing-result tables are validated at open/restore.
- `src/core/processing-result-persistence.js` requires generation supplied by the caller and must remain downstream of canonical decision establishment.
- `src/core/ingestion.js` currently computes the confirmation-safe head and advances the cursor only after processor/authority success. STEP 577 does not alter that behavior.

Conclusion: the smallest safe design is a dedicated canonical-decision module plus additive schema version 6, with no modification to existing canonical-evidence, processing-result, authority, or cursor semantics.

## 3. Design boundary

### 3.1 New module

Production implementation SHOULD introduce:

`src/core/canonical-decision-input.js`

Responsibilities:

1. validate exact requested range and confirmation-safe decision head;
2. acquire block headers through the configured block-oriented provider API;
3. validate chain ID, block number, canonical 32-byte hashes, and contiguous parent linkage;
4. construct immutable CBDRs;
5. persist CBDRs and snapshot membership under the existing writer fence;
6. reconstruct and verify persisted CBDRs;
7. detect competing branch observations without overwriting historical records;
8. derive deterministic CBDR and snapshot identities;
9. fail closed on corruption, conflict, missing history, writer loss, or persistence failure.

Non-responsibilities:

- raw log acquisition;
- canonical evidence interpretation;
- F-02 transition-history ownership;
- generation assignment;
- processing-result persistence;
- submitted/live authority;
- expected F-03 authority;
- cursor advancement;
- V4 activation.

### 3.2 Provider API boundary

Use the existing configured ethers provider's block-oriented method:

`provider.getBlock(blockNumber)`

The implementation MUST verify the returned header instead of trusting the method response.

The returned block object MUST provide:

- `number`;
- `hash`;
- `parentHash`.

A missing block or missing/invalid hash MUST fail closed.

The provider network chain ID MUST be checked against configured `CHAIN_ID` before header admission. The block header itself has no independent chain-id field in the ethers block response, so chain identity is established by the verified provider network plus the configured chain ID; the resulting CBDR records that chain ID explicitly.

No `getLogs()` response may substitute for a header.

## 4. Exact decision-head and range API

The primary API SHOULD be:

```js
await createCanonicalDecisionInput({
  provider,
  db,
  writerFence,
  chainId,
  confirmations,
  sourceId,
  latestBlock,
  fromBlock,
  toBlock,
  acquiredAt,
})
```

The implementation MUST NOT silently obtain a different requested range.

If `latestBlock` is supplied, it is an acquisition observation only and MUST be validated as a non-negative safe integer. Otherwise the module MAY obtain it through `provider.getBlockNumber()`.

Decision head:

`decisionHead = latestBlock - confirmations`

Unlike the existing generic `getSafeHead()` clamping behavior, canonical decision admission MUST reject when `latestBlock < confirmations` rather than silently clamp the decision head to zero. The frozen STEP 576 contract requires the decision head to be the explicit result of `latestBlock - confirmations` and requires exact range validation. This difference is local to canonical-decision admission and does not modify `src/core/confirmation.js`.

The exact eligibility condition is:

`0 <= fromBlock <= toBlock <= decisionHead`

Any violation is fail-closed.

## 5. Source identity

STEP 576 requires source identity in both CBDR and snapshot identity.

The smallest repository-compatible source identity is the exact configured RPC source identifier:

`sourceId = "rpc:" + RPC_URL`

The implementation SHOULD accept an explicit `sourceId` override only when it is a non-empty string; production wiring SHOULD use the configured source identifier deterministically.

No timestamps, writer-fence values, random IDs, or cursor state participate in source identity.

## 6. CBDR record schema

The persisted table SHOULD be:

`canonical_block_decisions`

Columns:

- `record_digest TEXT PRIMARY KEY`
- `chain_id INTEGER NOT NULL`
- `block_number INTEGER NOT NULL`
- `block_hash TEXT NOT NULL`
- `parent_block_hash TEXT NOT NULL`
- `decision_head_block INTEGER NOT NULL`
- `confirmation_depth INTEGER NOT NULL`
- `source_id TEXT NOT NULL`
- `acquired_at TEXT NOT NULL`

Required constraints:

- chain ID non-negative;
- block number non-negative;
- decision head non-negative;
- confirmation depth non-negative;
- block and parent hashes are canonical lowercase `0x` + 64 hex characters;
- unique semantic observation `(chain_id, block_number, block_hash)`;
- no update/delete path in the runtime API.

`record_digest` is the deterministic CBDR identity and is calculated without `acquired_at`. The acquisition timestamp remains provenance only.

## 7. Snapshot persistence

A separate immutable snapshot table SHOULD be used:

`canonical_decision_snapshots`

Columns:

- `snapshot_id TEXT PRIMARY KEY`
- `chain_id INTEGER NOT NULL`
- `from_block INTEGER NOT NULL`
- `to_block INTEGER NOT NULL`
- `decision_head_block INTEGER NOT NULL`
- `confirmation_depth INTEGER NOT NULL`
- `source_id TEXT NOT NULL`
- `created_at TEXT NOT NULL`

Membership table:

`canonical_decision_snapshot_blocks`

Columns:

- `snapshot_id TEXT NOT NULL`
- `ordinal INTEGER NOT NULL`
- `block_number INTEGER NOT NULL`
- `record_digest TEXT NOT NULL`
- `block_hash TEXT NOT NULL`
- primary key `(snapshot_id, ordinal)`;
- foreign keys to snapshot and CBDR record;
- unique `(snapshot_id, block_number)`.

This separates immutable block observations from exact-range decisions. The same CBDR may be referenced by multiple deterministic snapshots without rewriting it. A competing block hash at the same height produces a distinct CBDR and can coexist with the historical observation.

The snapshot membership is ordered by block number and MUST reconstruct exactly `fromBlock..toBlock`.

## 8. Schema migration

The repository is currently schema version 5.

STEP 577 design freezes an additive v5→v6 migration boundary. The migration MUST:

1. preserve every v5 table and row;
2. create the three canonical-decision tables;
3. update `schema_meta.schema_version` from `5` to `6` only after all tables are created successfully;
4. run transactionally;
5. fail without partial schema-version advancement;
6. validate the new tables when opening/restoring a v6 database.

No v5 table is altered, renamed, deleted, or rewritten.

The previously designed STEP 574 runtime lineage/transition-history tables remain separate implementation scope. If they are introduced in the same future schema version, their DDL MUST be additive and explicitly reconciled; STEP 577 does not silently merge or replace that design.

## 9. Exact CBDR digest formula

Domain:

`HAHAWEEK-CANONICAL-DECISION-RECORD-V1`

Payload:

```json
{
  "block_hash": "<lowercase 0x + 64 hex>",
  "block_number": "<decimal string>",
  "chain_id": "<decimal string>",
  "confirmation_depth": "<decimal string>",
  "decision_head_block": "<decimal string>",
  "parent_block_hash": "<lowercase 0x + 64 hex>",
  "source_id": "<exact source identity>"
}
```

Digest bytes:

`SHA256(UTF8(domain) || 0x00 || canonicalUtf8(payload))`

Stored representation:

`cdbr:v1:<64 lowercase hex>`

`acquired_at` is deliberately excluded from the digest.

## 10. Exact snapshot identity formula

Domain:

`HAHAWEEK-CANONICAL-DECISION-SNAPSHOT-V1`

Payload:

```json
{
  "block_identities": [
    {
      "block_hash": "<lowercase 0x + 64 hex>",
      "block_number": "<decimal string>",
      "chain_id": "<decimal string>"
    }
  ],
  "chain_id": "<decimal string>",
  "confirmation_depth": "<decimal string>",
  "contract": "HAHAWEEK-CANONICAL-DECISION-SNAPSHOT-V1",
  "decision_head_block": "<decimal string>",
  "from_block": "<decimal string>",
  "source_id": "<exact source identity>",
  "to_block": "<decimal string>"
}
```

The array order is exactly ascending block number from `fromBlock` through `toBlock`.

Digest bytes:

`SHA256(UTF8(domain) || 0x00 || canonicalUtf8(payload))`

Stored representation:

`cds:v1:<64 lowercase hex>`

No record digest, acquisition time, writer-fence value, cursor, generation, or arbitrary hash truncation participates in snapshot identity.

## 11. Parent-link verification

For an exact range:

- every block number MUST equal its expected ordinal;
- for each block after the first, `parent_block_hash` MUST equal the immediately preceding CBDR `block_hash`;
- for `fromBlock > 0`, the first block's parent MUST be established from persisted adjacent header evidence.

The implementation SHOULD query the adjacent predecessor only when it is not already available in the persisted canonical-decision store.

If the predecessor cannot be reconstructed, the range is not canonical-decision complete and MUST fail closed.

Block zero is the only height whose parent relation is not required to reference a prior block within the chain.

## 12. Conflict and branch preservation

The runtime persistence API MUST be append-only.

For an existing `(chain_id, block_number, block_hash)`:

- identical semantic content is idempotent;
- a different `block_hash` at the same height is a competing historical observation, never an update;
- different parent hash for the same block identity is an integrity conflict and MUST fail closed;
- different decision-head/confirmation/source provenance for an already persisted semantic CBDR MUST not mutate the old row.

The snapshot layer distinguishes exact decision snapshots. A later snapshot may select a different branch while preserving the prior snapshot and all prior CBDRs.

No SQL `UPDATE` or `DELETE` is exposed by the canonical-decision persistence module.

## 13. Reorg/common-ancestor input

STEP 577 only designs the input required by STEP 573.

For a new snapshot whose block identity conflicts with a prior accepted observation at the same height:

1. retain both block observations;
2. walk persisted parent evidence backwards by block hash;
3. find the highest common block identity present in both branches;
4. define the replacement range strictly from explicit branch membership;
5. if no common ancestor can be established from persisted evidence, fail closed.

The canonical-decision module returns structured branch evidence; it does not create OBSERVED/CANONICAL/ORPHANED transitions or assign generation.

## 14. Writer-fence ordering

Before any canonical-decision persistence or admission:

`writerFence.assertOwned()`

MUST succeed.

The future implementation SHOULD assert ownership:

1. before acquisition/persistence begins;
2. before committing snapshot membership;
3. immediately before returning authority-eligible canonical decision input.

Loss of ownership at any point MUST fail closed.

The fence token/value is operational only and never enters either digest formula.

## 15. Recovery and replay

Recovery API SHOULD expose:

```js
readCanonicalDecisionSnapshot(snapshotId)
reconstructCanonicalDecision({ fromBlock, toBlock, decisionHeadBlock, chainId, sourceId, confirmations })
findCanonicalBlock({ chainId, blockNumber, blockHash })
findBranchCommonAncestor(...)
```

All readers MUST verify stored record digests, snapshot identity, membership ordering, and parent linkage before returning an authority-eligible decision.

A missing or corrupt member causes failure. It MUST NOT be silently regenerated or substituted from another source.

Replaying identical persisted CBDRs with identical exact inputs MUST produce the same snapshot identity and ordered block identities.

## 16. Failure taxonomy

The implementation SHOULD use explicit fail-closed errors for at least:

- `INVALID_RANGE`
- `RANGE_ABOVE_DECISION_HEAD`
- `INVALID_BLOCK_HEADER`
- `BLOCK_NUMBER_MISMATCH`
- `CHAIN_ID_MISMATCH`
- `MALFORMED_BLOCK_HASH`
- `MALFORMED_PARENT_HASH`
- `PARENT_LINK_MISMATCH`
- `CBDR_INTEGRITY_CONFLICT`
- `CBDR_PERSISTENCE_FAILURE`
- `SNAPSHOT_INTEGRITY_CONFLICT`
- `SNAPSHOT_MEMBER_MISSING`
- `CANONICAL_DECISION_REPLAY_MISMATCH`
- `CANONICAL_DECISION_BRANCH_INCOMPLETE`
- `COMMON_ANCESTOR_MISSING`
- `WRITER_FENCE_REQUIRED`

Exact error strings are implementation details unless promoted into a later contract; they MUST remain deterministic and documented by tests.

## 17. Test design

The implementation stage MUST add focused tests without changing existing tests merely to obtain green CI.

Required coverage:

### Header/range validation
- wrong block number;
- wrong chain ID;
- malformed block hash;
- malformed parent hash;
- range above decision head;
- negative/invalid inputs;
- broken contiguous parent linkage;
- predecessor missing for first block.

### Persistence/integrity
- first CBDR persistence;
- idempotent replay;
- duplicate semantic record;
- conflicting block hash preservation;
- conflicting parent for same block identity;
- corrupted stored CBDR;
- missing snapshot member;
- persistence failure with no schema/history corruption.

### Recovery/replay
- restart reconstruction;
- identical replay yields identical snapshot identity;
- exact range reconstruction;
- decision-head provenance survives restart.

### Branch/reorg input
- competing branches coexist;
- common ancestor is found from persisted evidence;
- incomplete branch fails closed;
- no common ancestor fails closed.

### Concurrency
- writer ownership required;
- ownership loss during admission fails closed;
- no canonical decision returned after lost fence.

### Golden vectors
The implementation MUST retain the exact vectors below and extend tests from them rather than regenerating expected values dynamically.

## 18. Frozen golden vectors

All hashes below are lowercase SHA-256 hex. The source identity is:

`rpc:https://rpc.mainnet.chain.robinhood.com`

### Vector A — one-block CBDR

Input payload:

```json
{"block_hash":"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","block_number":"100","chain_id":"4663","confirmation_depth":"3","decision_head_block":"100","parent_block_hash":"0x0000000000000000000000000000000000000000000000000000000000000000","source_id":"rpc:https://rpc.mainnet.chain.robinhood.com"}
```

Expected record digest:

`cdbr:v1:23dc1e2070bab3f442498549455ed3076e2ffdf7f40975745422c880dd605fe4`

### Vector B — contiguous two-block CBDRs

Block 100 uses hash `0xaaaa...aaaa) and parent `0x0000...0000`; block 101 uses hash `0xbbbb...bbbb) and parent `0xaaaa...aaaa`. Both use chain 4663, confirmation depth 3, source above, and decision head 101.

Expected block 100 record digest:

`cdbr:v1:23dc1e2070bab3f442498549455ed3076e2ffdf7f40975745422c880dd605fe4`

Expected block 101 record digest:

`cdbr:v1:c38b29f4100f64b7bf8e9ca8eea0da557161d4354e182b0b9613fa0f7d70aeb9`

### Vector C — contiguous snapshot identity

Range: 100..101. Decision head: 101. Chain: 4663. Confirmation depth: 3. Source: the source above.

Expected snapshot identity:

`cds:v1:6e726bea56b89112c8b40d1825c5343031abcb024586f94610a1fef6b176bf8e`

### Vector D — rejection boundary

For latest block 103 and confirmation depth 3:

`decisionHead = 100`

Range 100..101 MUST reject with `RANGE_ABOVE_DECISION_HEAD`.

No digest is assigned to a rejected snapshot.

### Vector E — parent mismatch

Replace block 101's parent with any hash other than block 100's accepted hash. The decision MUST reject with `PARENT_LINK_MISMATCH`.

No snapshot identity is committed.

### Vector F — block conflict

Persist block 100 with hash A, then observe block 100 with hash B. Both CBDRs MUST remain queryable. The original CBDR MUST remain byte-for-byte unchanged. The snapshot layer MUST never overwrite the original observation.

### Vector G — identical replay

Replaying the exact Vector B CBDRs and exact 100..101 decision inputs MUST return the exact Vector C snapshot identity.

### Vector H — competing branch preservation

Persist branch A at block 100 and branch B at block 100 with distinct hashes. Both records remain present; neither is normalized into the other.

### Vector I — deterministic reorg input

Given persisted branch A:
- 100: hash A, parent zero
- 101: hash B, parent A

and replacement branch B:
- 100: hash A, parent zero
- 101: hash C, parent A

the common ancestor MUST be block 100 and the replacement range begins at block 101. No transition record is created by this module.

### Vector J — corrupted/missing recovery

Remove or corrupt a snapshot member/record referenced by a committed snapshot. Reconstruction MUST fail closed and MUST NOT regenerate the missing record silently.

## 19. Integration order

The future implementation MUST follow this order:

1. writer-fence assertion;
2. provider chain-ID verification;
3. exact latest/confirmation decision-head calculation;
4. exact-range validation;
5. block-header acquisition;
6. CBDR validation/digest derivation;
7. immutable CBDR persistence;
8. exact snapshot membership persistence;
9. persisted snapshot reconstruction and verification;
10. return verified canonical-decision input;
11. only then allow downstream canonical-lineage code to consume it.

Cursor advancement remains downstream and unchanged.

## 20. Compatibility and non-goals

This design intentionally does not:

- modify `src/core/confirmation.js`;
- modify raw-event identity;
- infer canonicality from logs;
- modify F-03;
- derive generation;
- call submitted authority;
- call expected authority as canonicality source;
- change STEP 563 formulas;
- change STEP 568 digest/identity semantics;
- reset or advance the cursor;
- activate V4 production;
- delete or rewrite historical evidence;
- introduce external project dependencies.

## 21. Acceptance criteria for STEP 577

1. Actual baseline repository surfaces were inspected.
2. The STEP 576 contract is translated into a concrete module/API boundary.
3. Additive persistence design is defined without altering existing tables.
4. Exact CBDR and snapshot identity formulas are frozen.
5. Golden vectors include deterministic expected hashes/results.
6. Parent linkage and branch preservation are concrete.
7. Reorg/common-ancestor input is bounded to STEP 577 scope.
8. Writer-fence, replay, recovery, and fail-closed ordering are explicit.
9. Tests and security/regression requirements are concrete.
10. No production code is changed in STEP 577.
11. STEP 563, STEP 568, cursor, F-03 authority, and V4 activation remain unchanged.
12. The next stage is production implementation of the frozen design.

## 22. Traceability

STEP 576 Contract
→ STEP 577 Design/Analysis
→ canonical decision persistence/API implementation
→ unit/integration/golden-vector tests
→ Security/Regression
→ CI
→ review
→ merge
→ post-merge verification
→ reconciliation
→ documentation
→ next implementation STEP.

## 23. Next STEP

**STEP 578 — Runtime Canonical Decision Input Persistence/API Implementation.**
