# STEP 614 — Runtime Scan Failure Boundary Design v0.1

## Objective

Restore the existing STEP 614 failure-handling boundary in `src/index.js` without changing operational-state semantics.

## Design

Add one import from `./core/operational-state` for the four functions already consumed by `src/index.js`:

- `classifyFailure`
- `createFailureState`
- `createHealthyState`
- `readOperationalState`

Add a focused regression test around the exported `main` entry point using an isolated temporary state/database/runtime boundary where practical. The test must verify that a forced runtime failure reaches the existing failure-state machinery and does not produce the secondary ReferenceError.

## Non-goals

No changes to:
- raw/canonical evidence
- database migration semantics
- cursor advancement/reset
- authority
- Surveillance
- V4
- signing/trading/execution
- provider semantics

## Acceptance

1. Existing operational-state module remains the sole authority for classification/state construction.
2. Scan failure remains visible.
3. Failure state remains fail-closed.
4. Existing cursor/evidence preservation behavior remains unchanged.
5. Full repository test and security/regression CI pass.
