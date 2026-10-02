# HAHAWEEK — A6 Design v0.1

**Contract:** `HAHAWEEK-A6-CANONICAL-TO-X-CONTENT-V0_1`  
**Baseline:** `93dd75c128be94069084687dfffcc50742bc5b4d`  
**Analysis:** `docs/A6_ANALYSIS_GAP_MATRIX_V0_1.md`  
**Phase:** DESIGN

## 1. Design Principle

Reuse the already implemented HFI-MVP/HFI-RADAR primitives. A6 will not replace authoritative evidence, cursor/checkpoint state, formation semantics, validation semantics, Research Report semantics, or X Content semantics.

The preferred path is:

`EXISTING VERIFIED COMPONENTS → FRESH EXACT-COMMIT RUNTIME PROOF → RECONCILIATION → CLAIM LEDGER → DOCUMENTATION`

Only a demonstrated acceptance gap may justify implementation changes.

## 2. Evidence Lineage Design

The canonical lineage remains:

`RAW → CANONICAL → IDENTITY → INTEGRITY → GRAPH → FORMATION → OUTCOME → VALIDATION → REPORT → CLAIM → X CONTENT`

Every downstream artifact must reference stable upstream IDs.

No downstream artifact may mutate authoritative raw/canonical evidence.

## 3. Runtime Design

Use the existing read-only `hfi:runtime` workflow.

Required runtime gates:

1. chain ID 4663;
2. candidate/target pool evidence from Robinhood Mainnet;
3. Pool Created, Liquidity Added, First Swap;
4. event-time ordering;
5. deterministic canonical evidence;
6. Formation;
7. seven-day Historical Outcome;
8. LIQUIDITY_SURVIVAL;
9. Validation;
10. Research Report;
11. Claims;
12. X Content projection;
13. X publication readiness without publication;
14. graph projection;
15. deterministic replay;
16. runtime artifact commit provenance.

A runtime failure is retained as FAILED and does not become a negative historical fact.

## 4. Temporal Design

Maintain separate:

- event_time;
- observation_time;
- processing_time.

Formation chronology is determined by event_time.

Historical Outcome begins at the fixed formation boundary and must not modify Formation.

Validation consumes the fixed Outcome and cannot feed its result backward.

## 5. Integrity / Recovery Design

Existing V4 integrity, checkpoint/cursor, and writer-fence implementations remain authoritative.

No cursor reset is permitted.

Recovery follows:

`LAST VERIFIED STATE → VERIFY DURABLE STATE → RECOVER → TEST → VERIFY → RECONCILE`

A6 adds no alternate writer or alternate cursor authority.

## 6. Graph Design

Reuse the existing deterministic Evidence Graph.

Do not expand node or edge semantics merely to match a conceptual list when the existing frozen implementation already satisfies the MVP boundary.

Formation references evidence IDs; graph output remains a rebuildable derived projection.

A universal new edge-level evidence field is NOT introduced unless an acceptance test demonstrates that the existing lineage is insufficient.

## 7. Research / Claims Design

Research Report remains governed by `RESEARCH_REPORT_CONTRACT_V0_1`.

Every material claim must include:

- claim_id;
- statement;
- evidence_ids;
- report/validation/outcome/formation lineage;
- limitations where applicable.

A6 will produce a separate claim ledger as reconciliation documentation. The ledger does not become evidence authority.

## 8. X Content Design

Reuse `x-content-v1` and publication-readiness validation.

X Content is a derived projection only.

No X API call, publication, scheduling, signing, or external mutation is performed.

The final A6 record must distinguish:

- X Content Ready;
- Publication Ready;
- Published.

Only the first two are potentially in scope here; Published remains outside authority.

## 9. Security Design

Reuse existing security/regression controls and add tests only where a demonstrated A6 gap exists.

Required A6 boundary checks:

- no authoritative evidence mutation;
- no cursor reset;
- no writer authority bypass;
- no future leakage;
- no identity overreach;
- no external publication;
- no transaction execution;
- no secret exposure.

## 10. Verification Plan

Verification classes:

- E1 static: current implementation/contract consistency;
- E2/E3: existing unit/integration tests;
- E4: existing adversarial/security tests;
- E5: fresh exact-main runtime;
- E0: final documentation/reconciliation.

E6 is explicitly outside A6.

## 11. Implementation Gate

**No runtime source change is authorized by this Design alone.**

If the fresh runtime demonstrates an actual defect against the Contract, create a minimal implementation change with its own:

`CODE → TEST → SECURITY/REGRESSION → CI → REVIEW → MERGE → POST-MERGE VERIFICATION → RUNTIME`

Otherwise, proceed directly to reconciliation/documentation.

## 12. Completion Boundary

A6 can be marked COMPLETE only after:

- Contract merged;
- static gap analysis reconciled;
- relevant tests/security pass;
- exact main CI verified;
- exact main runtime reaches terminal VERIFIED or a documented Contract-valid degraded state;
- runtime artifact provenance verified;
- replay/no-look-ahead/integrity/recovery requirements verified;
- Research Report and claim lineage reconciled;
- X Content projection reconciled;
- PROJECT_STATE updated to actual reality;
- claim ledger completed;
- no external action occurred.

