# STEP 473 — Radar Documentation Integration Boundary v0.1

Status: IMPLEMENTATION CANDIDATE

## Objective

Establish the integration boundary for the frozen STEP 472 Radar Documentation Projection.

## Boundary

VERIFIED RADAR RECORD → DOCUMENTATION INTEGRATION → FROZEN DOCUMENTATION PROJECTION

The integration adapter delegates documentation semantics to STEP 472. It does not redefine the contract.

## Invariants

- Input must contain a Radar Record object.
- Caller-owned input is cloned before delegation.
- STEP 472 remains the sole owner of documentation semantics.
- Deterministic document identity remains delegated.
- VERIFIED-only eligibility remains delegated.
- No prediction, ranking, trading/signing, raw-store, cursor/runtime, or V4 authority changes.

## Verification Target

- valid delegation;
- deterministic identity;
- mutation isolation;
- rejection of non-VERIFIED radar.

## Scope

Integration boundary only. No new intelligence semantics.
