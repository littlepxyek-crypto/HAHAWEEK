# STEP 584 — Runtime Canonical Lineage / Processing Context Integration Implementation Contract v0.1

Status: CONTRACT
Step: 584
Predecessor: STEP 583
Baseline: 8ab2f1ee93d3a13f4f2bb17e1fc295aaa148fe18
V4 production activation: INACTIVE

## 1. Purpose

Authorize the smallest production implementation that connects the frozen STEP 583 design to the existing runtime.

Required path:

canonical decision snapshot
→ exact raw ingestion
→ STEP 579 canonical lineage
→ STEP 568 durable verified processing result
→ exact verified processing context
→ authority binding
→ cursor advancement.

## 2. Authorized files/scope

Production changes are limited to the smallest repository-compatible integration, expected to involve:
- a runtime processing-context orchestration module;
- `src/index.js` wiring;
- `src/core/ingestion.js` success-boundary/context propagation;
- the existing authority gate only where required to bind verified context;
- focused integration/regression tests;
- operator-facing output only as a projection of verified context.

Exact changed files must be justified by the implementation PR.

No schema migration or new dependency is authorized.

## 3. Required processing-context contract

The integration MUST return a VERIFIED immutable context containing:
- status;
- fromBlock;
- toBlock;
- processingResultId;
- processingExecutionId;
- parentResultId;
- transitionType;
- generation;
- canonicalEvidenceIds;
- emptyResult;
- evidenceSetDigest;
- lineageId;
- provenance;
- committedAt;
- canonicalDecisionSnapshotId.

No field owned by STEP 568/579 may be recomputed.

## 4. Required ordering

1. Validate exact range.
2. Assert existing writer fence.
3. Capture outer database snapshot.
4. Create/reconstruct exact canonical decision snapshot.
5. Ingest raw evidence for the exact range.
6. Invoke STEP 579 canonical lineage.
7. Require STEP 568 durable verification and reconstructed lineage.
8. Return only VERIFIED context.
9. Bind authority to exact range and verified context.
10. Advance cursor only after authority succeeds.

Raw counters are never checkpoint success.

## 5. Durability and failure

Before durable processing-result success:
- restore outer snapshot on failure;
- do not invoke authority;
- do not advance cursor.

After durable immutable result/lineage success:
- preserve historical evidence if authority or cursor fails;
- leave cursor unchanged;
- retry must reuse deterministic durable context;
- never delete/rewrite history to repair cursor continuity.

## 6. Authority binding

The existing authority gate MUST receive the verified processing context.

It MUST reject:
- missing context;
- non-VERIFIED status;
- exact-range mismatch;
- authority generation mismatch;
- authority cursor endpoint mismatch;
- existing expected-authority binding conflicts.

Authority remains an independent authority source. It cannot establish canonicality, generation, parent, evidence membership, or processing identity.

If a required authority contract change is discovered that is not covered here, stop and create a new contract rather than silently changing semantics.

## 7. Cursor

The existing `BlockCursor.advance(toBlock)` API remains unchanged.

The caller must establish the complete verification barrier immediately before advancing.

No cursor reset or historical rewrite is permitted.

## 8. Reorg/replay/restart

Identical canonical snapshot/range must produce the same deterministic result/execution/lineage identity and evidence digest.

Changed canonical state must use STEP 579 reorg replacement semantics with a new generation and preserved prior history.

Restart after durable processing but before cursor advancement must reconstruct and reuse the durable context without creating a conflicting duplicate.

## 9. Concurrency

The existing `single-writer-fence.js` is the sole writer authority.

Assert ownership at critical boundaries. Do not introduce another mutex, lock, or lease.

## 10. Operator observability

The existing runtime output may be extended only with derived verified context:
- exact processed range;
- processing-result ID;
- lineage ID;
- transition;
- generation;
- evidence-set digest;
- authority status;
- cursor outcome.

Output is informational only. Durable database evidence remains authoritative.

Failure output MUST distinguish at minimum:
- processing/verification failure;
- authority rejection;
- cursor not advanced.

## 11. Acceptance tests

Positive:
1. exact range returns VERIFIED context;
2. empty result is explicit;
3. replay is deterministic/idempotent;
4. restart after durable result reuses identity;
5. continuation preserves parent/generation;
6. reorg creates new generation and preserves prior history.

Negative:
7. snapshot/range mismatch;
8. raw ingestion failure;
9. evidence/digest tampering;
10. lineage/result conflict;
11. writer-fence loss;
12. save failure;
13. authority generation mismatch;
14. authority cursor/range mismatch;
15. cursor regression;
16. concurrent same-range conflict.

Boundary:
17. raw-only success cannot advance cursor;
18. unverified context cannot pass authority;
19. expected authority cannot establish canonicality/generation;
20. no cursor reset;
21. existing STEP 568/579 golden vectors unchanged.

## 12. Security/Regression/CI

Required:
- `npm test`;
- `npm run verify:v4`;
- `npm run verify:v4:coverage`;
- dependency audit;
- tracked-secret detection;
- Security/Regression workflow;
- CodeQL;
- PR-head evidence;
- exact merge-commit post-merge evidence.

Tests must not be weakened to obtain green CI.

## 13. V4 boundary

V4 production activation remains INACTIVE.

No Gate 2 PASS is claimed unless all separately defined Gate 2 criteria are actually evidenced.

## 14. Completion

STEP 584 is complete only after:
- implementation contract merged;
- production implementation and focused tests merged under the frozen scope;
- security/regression and CI pass;
- review evidence exists;
- exact merge commit post-merge verification passes;
- reconciliation/documentation complete;
- next STEP recorded.

Traceability:
STEP 583 analysis/design → STEP 584 contract → code → test → security/regression → CI → review → merge → post-merge verification → reconciliation → documentation.
