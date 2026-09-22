# STEP 454 — Derived Evidence Consumer Boundary v0.1

Status: IMPLEMENTATION CANDIDATE

## Objective

Define a narrow downstream-consumer boundary for the frozen DERIVED Formation Evidence Reference without allowing authority escalation or lineage loss.

## Boundary

VALID FORMATION → DERIVED EVIDENCE REFERENCE → DERIVED CONSUMER INPUT

## Invariants

- Only evidence class DERIVED is accepted.
- Frozen Formation Evidence Reference lineage is preserved.
- Chain ID, selected evidence IDs, event ordering, graph reference, and provenance reference remain consistent.
- Downstream output is deeply cloned and cannot mutate the supplied DERIVED reference.
- Processing metadata such as created_at is not part of the consumer contract.
- The consumer boundary contains no authoritative raw response, request parameters, cursor, runtime state, or V4 authority.
- This step does not capture live blockchain evidence and does not promote DERIVED data to AUTHORITATIVE evidence.

## Verification Vectors

1. Valid DERIVED reference is accepted.
2. AUTHORITATIVE contamination is rejected.
3. Provenance mismatch is rejected.
4. Nested output mutation does not mutate the input reference.
5. Processing metadata is excluded.
6. Repeated construction produces deterministic semantic output.
