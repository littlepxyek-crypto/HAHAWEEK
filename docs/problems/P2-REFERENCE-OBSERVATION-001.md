# Problem Record — Reference Observation Validation Promotion

ID: P2-REFERENCE-OBSERVATION-001
Severity: P2 — MEDIUM
Discovered At: 2026-10-07
Location: src/reference/reference-observation.js

## Symptom

The first Reference Intelligence implementation allowed an OBSERVED Reference Observation to transition directly to VALIDATED.

## Immediate Cause

The initial transition table included VALIDATED in the OBSERVED allowed-transition set.

## Root Cause

The state machine did not enforce the intended separation between provider observation and explicit analytical relevance.

## Architectural Impact

This could allow a provider observation, including a third-party identity label, to bypass the intended:
OBSERVED -> ANALYTICALLY_RELEVANT -> VALIDATED
boundary.

No canonical evidence, V4 authority, cursor, checkpoint, manifest, or production authority was affected.

## Corrective Action

Removed direct OBSERVED -> VALIDATED transition. VALIDATED now requires the explicit ANALYTICALLY_RELEVANT intermediate state.

## Verification

The negative vector initially failed with "Missing expected exception", proving the defect was executable rather than documentary.

After correction:
- HAHAWEEK Tests: SUCCESS
- HAHAWEEK Security and Regression: SUCCESS
- A9 Runtime Verification: SUCCESS
- Analytical Reorg Runtime Verification: SUCCESS
- PR validation suite: SUCCESS

The HFI-MVP runtime verification for the current branch remains independently in progress and is not used to claim this Reference Intelligence defect is runtime-verified.

## Regression Test

tests/reference-intelligence-contract.test.js:
- identity label cannot self-promote to validated
- validated state requires explicit analytical transitions

## Residual Risk

Reference Intelligence remains a controlled fixture abstraction. No external provider has been integrated, and no claim is made that provider-specific historical/as-of semantics are independently verified.
