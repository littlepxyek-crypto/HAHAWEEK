# STEP 557 — F-03 Design Gate 2 Re-Review Contract v0.1

Status: RE-REVIEW CONTRACT
Step: 557
Baseline: STEP 555 reconciled on `main`

## Purpose

Define the evidence boundary for re-reviewing F-03 against Design Gate 2 after the durable authoritative-chain implementation and cursor-boundary amendment were merged.

## Scope

Review only F-03:

- durable segment -> manifest -> checkpoint persistence;
- schema 3 -> 4 migration;
- immutable provenance/linkage;
- deterministic read;
- cursorBlock := persisted segment.toBlock;
- STEP 550 durable expected-authority source;
- writer fencing and legacy write barrier;
- failed-export recovery;
- executable regression evidence.

## Acceptance

F-03 may move from CONDITIONAL to VERIFIED/FROZEN only if:

1. STEP 554 contract is implemented;
2. STEP 556 cursor boundary is implemented;
3. final Tests CI is SUCCESS;
4. final Security/Regression CI is SUCCESS;
5. implementation and regression changes are merged;
6. reconciliation is present on main;
7. no historical evidence was deleted or rewritten;
8. V4 production remains inactive.

This review MUST NOT mark Design Gate 2 PASS.

## Explicit prohibitions

No V4 activation, cursor reset/migration, historical rewrite, evidence deletion, frozen-contract replacement, or bypass of existing authority binding is authorized.

## Evidence boundary

Primary evidence:

- STEP 555 reconciliation;
- PR #289, #290, #291, #292;
- final successful CI runs `35959736276`, `35959736344`;
- merged implementation commits;
- STEP 556 reconciliation and contract;
- current main repository state.

## Next

After this contract is merged and reconciled, perform the F-03 Gate 2 re-review and update only the F-03 gate state if its acceptance criteria remain satisfied.
