# HAHAWEEK — ANALYTICAL TRANSITION CONTRACT v1

Status: IMPLEMENTED / VERIFICATION PENDING

## Purpose

Formation, Hypothesis, and Validation transitions are analytical state
transitions. They are not V4 evidence transitions and cannot mutate V4
authority.

## Separate domains

- Formation: `HAHAWEEK-EVIDENCE-V4-FORMATION-TRANSITION`
- Hypothesis: `HAHAWEEK-EVIDENCE-V4-HYPOTHESIS-TRANSITION`
- Validation: `HAHAWEEK-EVIDENCE-V4-VALIDATION-TRANSITION`

Each transition contains:

- transition_id
- schema_version
- domain
- entity_id
- previous_state
- next_state
- reason
- evidence_ids
- temporal_context
- rule_version
- processing_context_id
- provenance
- sequence
- previous_transition_id

## Authority boundary

Analytical transitions:

- may reference V4 evidence;
- do not replace V4 evidence transitions;
- do not mutate cursor/checkpoint/manifest;
- do not establish canonicality;
- are rebuildable derived state.

## State vocabularies

Formation:
`OBSERVED, PARTIAL, CANDIDATE, VALID, UNKNOWN, INCONCLUSIVE`

Hypothesis:
`PROPOSED, SUPPORTED, REFUTED, UNKNOWN, INCONCLUSIVE`

Validation:
`PENDING, EVALUATING, CONFIRMED, REJECTED, UNKNOWN, INCONCLUSIVE`

These vocabularies are deliberately distinct from V4 authority states.

## Acceptance

A transition is invalid when its domain/state vocabulary, provenance,
temporal context, evidence references, or processing context is missing.
