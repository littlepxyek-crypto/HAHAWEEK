# STEP 567 — Durable Processing-Result / Generation Persistence Implementation Contract v0.1

Status: CONTRACT
Predecessor: STEP 566
Repository baseline: 00643838f19f7b041512d165293dad945a04eaea
Current schema: v4
Target schema: v5
V4 production activation: INACTIVE

## Scope

Implement the STEP 566 persistence boundary as an additive SQLite schema migration and a fail-closed persistence module. No submitted-authority producer or V4 activation is included.

## Schema v5

Add exactly two tables.

### processing_results

- result_id TEXT PRIMARY KEY
- processing_execution_id TEXT NOT NULL
- parent_result_id TEXT NULL
- transition_type TEXT NOT NULL
- from_block INTEGER NOT NULL
- to_block INTEGER NOT NULL
- generation TEXT NOT NULL
- status TEXT NOT NULL
- canonicality_status TEXT NOT NULL
- empty_result INTEGER NOT NULL
- evidence_set_digest TEXT NOT NULL
- provenance_json TEXT NOT NULL
- committed_at TEXT NOT NULL

Constraints:
- from_block >= 0
- to_block >= 0
- from_block <= to_block
- empty_result IN (0,1)
- status = ACCEPTED for persisted authority-eligible records
- canonicality_status = CANONICAL for persisted authority-eligible records
- transition_type ∈ INITIAL, CONTINUATION, REORG_REPLACEMENT
- UNIQUE(processing_execution_id)
- optional parent_result_id references processing_results(result_id)

### processing_result_evidence

- result_id TEXT NOT NULL
- ordinal INTEGER NOT NULL
- evidence_id TEXT NOT NULL
- raw_event_id TEXT NOT NULL
- identity_hash TEXT NOT NULL
- raw_hash TEXT NOT NULL
- canonical_hash TEXT NOT NULL
- block_number INTEGER NOT NULL
- transaction_index INTEGER NOT NULL
- log_index INTEGER NOT NULL
- PRIMARY KEY(result_id, ordinal)
- FOREIGN KEY result_id → processing_results(result_id)
- FOREIGN KEY evidence_id → canonical_evidence(evidence_id)
- FOREIGN KEY raw_event_id → raw_events(event_id)
- UNIQUE(result_id, evidence_id)

No UPDATE or DELETE API is exposed by the persistence module.

## Validation

Before transaction:
- validate result identity and execution identity;
- validate exact inclusive range;
- validate generation using existing F-03 uint64 decimal rule;
- validate status/canonicality/transition;
- validate explicit empty_result;
- validate deterministic evidence ordering;
- validate every evidence membership against canonical_evidence and raw_events;
- reject missing transaction_index;
- reject outside-range evidence;
- reject duplicate authority keys;
- reject reorg-invalid/noncanonical evidence;
- verify evidence_set_digest deterministically from ordered membership;
- verify lineage rules.

Generation is supplied by caller as canonical-processing lineage. The implementation MUST NOT derive or alter it.

## Transaction and durability

Use the existing database transaction and save model.

Order:
1. validate all inputs without mutation;
2. acquire/verify existing writer ownership where applicable;
3. BEGIN;
4. insert processing result;
5. insert all membership rows;
6. verify persisted rows and foreign-key integrity;
7. COMMIT;
8. durable database save;
9. only then return the accepted context.

On any failure before durable save, rollback and leave prior durable state unchanged.

If durable save fails after SQLite COMMIT, restore the pre-transaction database snapshot before propagating failure.

## Idempotence and conflicts

Identical result replay MUST return the existing equivalent context without mutation.

Same result_id with different content MUST fail with an integrity-conflict error.

Same processing_execution_id with different result MUST fail closed.

Existing result membership mismatch MUST fail closed.

## Recovery

Schema migration v4→v5 is additive and transactional. Existing v4 data must remain unchanged. A database at v5 must validate both new tables exactly.

Restart must recover all committed accepted results. Partial transactions must not be visible.

## Reorg

Never mutate/delete an accepted historical result.

REORG_REPLACEMENT requires:
- parent_result_id;
- new result_id;
- explicitly supplied new generation;
- canonical replacement evidence;
- exact range;
- preserved old result.

## Reader

Provide a fail-closed reader that returns the immutable processing-result context required by STEP 564, including ordered canonical evidence membership.

Reader MUST verify persisted linkage and deterministic membership before returning.

## Non-goals

No cursor mutation, authority-gate change, submitted authority producer, expected-authority access, RPC/provider change, historical rewrite, evidence deletion, or V4 activation.

## Acceptance criteria

- v4→v5 migration passes fresh and existing-database tests.
- Existing v4 F-03 schema remains unchanged.
- New tables are validated structurally.
- Successful persistence is durable and restart-readable.
- Duplicate replay is idempotent.
- conflicting replay fails closed.
- generation is never manufactured.
- evidence membership is exact and deterministic.
- rollback/save failure restores prior state.
- reorg replacement preserves history.
- reader verifies integrity before returning.
