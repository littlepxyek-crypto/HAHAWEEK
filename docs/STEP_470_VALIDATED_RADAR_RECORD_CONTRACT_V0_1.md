# STEP 470 — Validated Radar Record Contract v0.1

Status: IMPLEMENTATION CANDIDATE

## Objective

Define the first canonical Radar output contract under the blueprint-aligned direction:

FORMATION → HISTORICAL OUTCOME → VALIDATION → INTELLIGENCE → EVIDENCE SUMMARY → RADAR

The record is an auditable output projection. It is not a prediction, ranking, trading instruction, or claim of future performance.

## Eligibility

Only CONFIRMED validation results may produce a VERIFIED radar record.

REJECTED and INCONCLUSIVE results remain valid historical states but are not emitted as verified radar records.

## Contract

Required lineage:

- summary_id
- intelligence_id
- formation_id
- outcome_id
- validation_id
- validation_result
- non-empty unique evidence_ids

Output constants:

- schema version 1
- radar rule version validated-radar-record-v1
- radar type EARLY_FORMATION
- state VERIFIED

## Determinism

radar_id is SHA-256 over the versioned identity payload. Evidence IDs are sorted only for identity calculation; the returned evidence list preserves caller order.

## Invariants

- Radar record is derived only from the frozen Intelligence Evidence Summary.
- Validation state is not reinterpreted.
- Every radar record carries evidence lineage.
- Output is detached from caller-owned input.
- No predictive score or ranking.
- No trading or signing.
- No raw-store, cursor, runtime, or V4 authority.
- Historical outcome is preserved as lineage, not used as a forward-looking guarantee.

## Verification Target

- valid confirmed radar record;
- deterministic identity;
- mutation isolation;
- rejection of non-confirmed validation;
- rejection of duplicate evidence IDs.
