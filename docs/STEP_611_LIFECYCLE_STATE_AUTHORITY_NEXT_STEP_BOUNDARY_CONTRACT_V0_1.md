# HAHAWEEK — STEP 611 Lifecycle State Authority & Next-Step Boundary Contract v0.1

Status: CONTRACT — IN PROGRESS
Step: 611
Parent boundary: STEP 610 Security/Regression — VERIFIED / RECONCILED / DOCUMENTED

## 1. PURPOSE

Establish an explicit repository-grounded lifecycle state authority boundary after STEP 610 so the project cannot enter a sequencing/documentation-state deadlock.

This Contract resolves only lifecycle-state sequencing. It does not select or implement a new domain/product capability such as slippage, price impact, durable materialization, scoring, risk, trading, or automated action.

## 2. CURRENT-STATE AUTHORITY

PROJECT_STATE.md on the latest reconciled main commit is the sole current authority for:
- current STEP;
- current lifecycle phase;
- status;
- verification/reconciliation/documentation state;
- authorized Next STEP.

Historical documents remain immutable historical evidence.

Stale lifecycle text in historical artifacts MUST NOT override current PROJECT_STATE.md.

## 3. STATE CONSISTENCY CONTRACT

Before a STEP is started or closed, the current state MUST explicitly reconcile:
- STEP number/name;
- Contract;
- lifecycle phase;
- status;
- Contract/Analysis/Design/Code/Test/Security evidence as applicable;
- CI evidence;
- Commit;
- PR;
- Merge;
- Post-Merge Verification;
- Reconciliation;
- Documentation;
- Next STEP.

Any conflict is FAIL-CLOSED until reconciled and verified.

## 4. NEXT-STEP AUTHORIZATION

A Next STEP becomes authorized only when:
1. a Contract explicitly establishes its number and scope;
2. the Contract is merged/reconciled into the current repository state;
3. PROJECT_STATE.md records that Contract as the current authority.

No Next STEP may be inferred from:
- historical documents;
- issue text;
- branches;
- PR titles/descriptions;
- stale metadata;
- out-of-scope notes;
- implementation convenience.

## 5. HISTORICAL PRESERVATION

This Contract MUST NOT:
- rewrite historical STEP documentation to current state;
- delete historical evidence;
- normalize historical metadata silently;
- change frozen technical contracts;
- alter raw/canonical evidence;
- reset or advance acquisition cursors;
- change V4 authority;
- introduce a new database authority.

Additive reconciliation/index/state records are permitted.

## 6. TRACEABILITY

Lifecycle state transitions MUST remain traceable:

Requirement
→ Contract
→ Analysis
→ Design
→ Code/Test where applicable
→ CI
→ Review
→ Merge
→ Verification
→ Reconciliation
→ Documentation
→ Next STEP.

No lifecycle state may be claimed without repository evidence.

## 7. OPERATOR ACCEPTANCE

The operator must be able to determine from repository state:
- what STEP is current;
- which Contract authorizes it;
- what phase is active;
- what evidence proves completion;
- whether a Next STEP is authorized;
- when STOP/FAIL-CLOSED applies.

No undocumented operator command or recovery procedure is introduced.

## 8. SURVEILLANCE

STEP 611 introduces no surveillance measurement or analytical authority.

Surveillance remains derived, evidence-linked, versioned, non-authoritative, and subject to existing boundaries.

ADDRESS != ACTOR remains unchanged.

## 9. SECURITY / FAIL-CLOSED

Fail closed on:
- conflicting current-state authorities;
- missing Contract;
- missing reconciliation;
- ambiguous STEP numbering;
- unsupported Next STEP inference;
- attempted historical rewrite;
- attempted raw/canonical mutation;
- cursor mutation;
- V4 authority expansion;
- scoring/risk/trading/automated action.

## 10. IMPLEMENTATION BOUNDARY

Implementation under STEP 611 may add only lifecycle-state validation/reconciliation support and associated tests/documentation required to enforce this Contract.

It MUST NOT introduce new production domain semantics.

## 11. ACCEPTANCE CRITERIA

1. Current-state authority is explicitly defined.
2. Historical documents remain immutable.
3. State-consistency fields are explicit.
4. Next STEP authorization requires an explicit Contract.
5. Issue/branch/PR text cannot authorize a STEP by inference.
6. Conflicting state causes FAIL-CLOSED behavior.
7. Historical evidence remains preserved.
8. No raw/canonical evidence, cursor, V4 authority, or production semantics change.
9. Operator acceptance is repository-grounded.
10. Surveillance boundaries remain unchanged.
11. The sequencing deadlock after STEP 610 is resolved without inventing a product feature.

## 12. OUT OF SCOPE

- slippage/price-impact implementation;
- durable measurement materialization;
- new database authority;
- scoring/risk;
- ranking;
- trading;
- automated action;
- actor identification;
- V4 production activation.

## 13. NEXT

After Contract verification and reconciliation, continue strictly:

Analysis → Design → Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation → Documentation → Next STEP.
