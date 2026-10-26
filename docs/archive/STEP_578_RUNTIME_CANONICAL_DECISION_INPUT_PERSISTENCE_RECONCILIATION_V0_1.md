# STEP 578 — Runtime Canonical Decision Input Persistence/API Implementation Reconciliation v0.1

Status: RECONCILIATION
Step: 578
Baseline: 5e408f0ce097e50ee7c2f09141ce545530b2ccd0
Implementation merge: dfb38c1d69cb2531423e54a459686f262d4c75d2
V4 production activation: INACTIVE

## 1. Delivered implementation

Implemented the frozen STEP 576 contract and STEP 577 design:

- `src/core/canonical-decision-input.js`
- additive database schema v6
- immutable canonical block decision records
- exact-range decision snapshots and ordered membership
- deterministic CBDR and snapshot identities
- block-header verification and chain-ID verification
- contiguous parent-link verification
- competing branch preservation
- persisted common-ancestor lookup
- writer-fence fail-closed admission
- transactional persistence
- deterministic replay/reconstruction
- corruption and missing-member detection

## 2. Schema

The implementation adds:

- `canonical_block_decisions`
- `canonical_decision_snapshots`
- `canonical_decision_snapshot_blocks`

Existing v5 data and existing F-03 / processing-result tables are preserved.

Schema v5→v6 migration is transactional and validated on open/restore.

## 3. Test and failure-recovery evidence

The first PR-head test run failed. Workflow logs were inspected and root causes were corrected rather than weakening semantics.

Corrected issues included:

- missing predecessor fixtures;
- schema-v6 migration fixtures;
- complete persisted branch fixtures;
- common-ancestor traversal over available persisted branch evidence;
- foreign-key-safe corruption simulation;
- persistence rollback fixture.

Final PR-head evidence for PR #339:

- Tests: SUCCESS
- Security & Regression: SUCCESS
- Analyze (actions): SUCCESS
- Analyze (javascript-typescript): SUCCESS
- CodeQL: SUCCESS

Review/comment evidence is recorded on PR #339 as COMMENT, not approval.

## 4. Merge and post-merge verification

PR #339 merged to main as:

`dfb38c1d69cb2531423e54a459686f262d4c75d2`

Post-merge verification confirmed the implementation files and tests exist on main and the diff from the STEP 577 baseline contains only the intended runtime implementation, schema, and test updates.

On the exact merge commit:

- test: SUCCESS
- test-and-security: SUCCESS
- CodeQL: SUCCESS
- Analyze (actions): still queued at reconciliation time
- Analyze (javascript-typescript): still in progress at reconciliation time

Therefore no claim is made that every static-analysis workflow on the exact merge commit had completed when this reconciliation was written.

## 5. Protected boundaries

No changes were made to:

- STEP 576 frozen contract;
- STEP 563 semantics;
- STEP 568 processing-result semantics;
- cursor advancement;
- F-03 authority;
- submitted authority;
- expected authority as canonicality source;
- V4 production activation.

The canonical decision module does not manufacture generation or processing identities.

## 6. Acceptance

STEP 578 implementation acceptance is satisfied by:

1. contract-to-code traceability;
2. additive schema v6;
3. deterministic identity formulas;
4. golden-vector coverage;
5. header/range validation;
6. parent-link validation;
7. immutable branch preservation;
8. replay/recovery verification;
9. writer-fence enforcement;
10. transactional persistence rollback;
11. migration coverage;
12. PR-head test/security/analysis evidence;
13. merge;
14. post-merge verification;
15. reconciliation.

## 7. Next STEP

**STEP 579 — Runtime Canonical Lineage Integration Implementation.**

This next stage must consume the verified canonical decision input without redefining canonicality, generation, cursor, F-03 authority, or STEP 568 semantics.
