# STEP 453 — Derived Evidence Reference Provenance Contract v0.1

Status: IMPLEMENTATION CANDIDATE

## Objective

Define and verify the provenance contract carried by the frozen DERIVED Formation Evidence Reference.

## Boundary

VALID FORMATION → DERIVED EVIDENCE REFERENCE → DOWNSTREAM DERIVED CONSUMERS

## Invariants

- Evidence class remains DERIVED.
- Provenance chain ID matches the Formation chain ID.
- Provenance evidence IDs exactly match the selected Formation evidence IDs and ordering.
- Processing metadata such as created_at is excluded from the provenance contract.
- The contract contains no authoritative raw response, request parameters, cursor, runtime state, or V4 authority.
- This step defines lineage semantics only; it does not create live authoritative evidence.
