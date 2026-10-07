# HAHAWEEK — Problem Record: Authority Acceptance Cursor Barrier

ID: P1-AUTHORITY-CURSOR-001
Severity: P1 — HIGH
Discovered: 2026-10-07
Status: RESOLVED

## Symptom

The ingestion engine invoked the configured authority gate and then advanced the cursor without checking that the returned authority outcome explicitly represented acceptance.

## Immediate Cause

IngestionEngine treated a non-throwing authority-gate call as sufficient for cursor advancement.

## Root Cause

The execution boundary encoded authority failure primarily through exceptions, while the contract requires an explicit acceptance result before the cursor barrier.

## Architectural Impact

Without an explicit result check, a future authority implementation returning a non-accepted status could allow:

PROCESS → NON-AUTHORITATIVE RESULT → CURSOR ADVANCE

That violates the V4 ordering invariant:

PROCESS → AUTHORITY ACCEPT → CURSOR ADVANCE

No evidence corruption was established in the inspected main history. The affected risk was authority/cursor ordering.

## Corrective Action

The ingestion engine now requires status === AUTHORIZED whenever an explicit authority gate is supplied. The cursor remains unchanged otherwise.

## Regression Coverage

Added rejection path for batch ingestion, successful explicit acceptance path, and rejection path for legacy single-block ingestion. Updated the existing F-03 boundary tests to return explicit AUTHORIZED acceptance.

## Verification

Local execution: NOT VERIFIED — this execution environment cannot resolve github.com, so repository checkout/npm execution was unavailable.

CI verification: VERIFIED on fix commit 5fea76336d96e10c06f45bc65c158f2dd12f9428.

HFI-MVP E2E runtime verification: VERIFIED on fix commit 5fea76336d96e10c06f45bc65c158f2dd12f9428. Runtime artifact state was VERIFIED; acquisition completeness was COMPLETE; formation was VALID; validation was CONFIRMED; replay equivalence was true; raw/canonical evidence counts were both 8664.

PR #750 was merged into main as commit 85c9b36ba60af787851d910fa0e28e3d0aaa8c54.

## Residual Risk

The low-level IngestionEngine retains an unguarded compatibility path when no authority gate is supplied. Production createEngine() supplies the F-03 authority gate. Removing the compatibility path would require a broader test/architecture reconciliation and is not included in this minimal correction.
