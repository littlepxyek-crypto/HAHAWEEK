# HAHAWEEK — FORMATION / HYPOTHESIS / VALIDATION STATE MACHINES V1

Status: VERIFIED — exact-head CI 34b4f26e02eb79d092936370f9885a771994d03b

## Scope

This contract closes the executable boundary between:

FORMATION → HYPOTHESIS → VALIDATION

without merging their state machines or granting analytical layers V4 authority.

## Formation

Formation remains an evidence-backed observed process.

For POOL_BOOTSTRAP the required evidence sequence is:

POOL_CREATED → LIQUIDITY_ADDED → FIRST_SWAP

A formation may be OBSERVED, PARTIAL, CANDIDATE, or VALID.

Acquisition incompleteness is never converted to a negative formation conclusion.

DISSOLVED is deliberately not defined by this contract.

## Hypothesis

A hypothesis:

- requires a VALID Formation;
- references Formation evidence;
- starts at PROPOSED;
- is DERIVED state;
- has a dedicated hypothesis transition domain;
- cannot mutate V4 authority;
- cannot become canonical evidence.

Hypothesis states:

PROPOSED → SUPPORTED / REFUTED / UNKNOWN / INCONCLUSIVE

and:

SUPPORTED → REFUTED / UNKNOWN / INCONCLUSIVE

There is no automatic promotion from validation result to authoritative evidence.

## Validation

Validation remains governed by VALIDATION_STATE_V2:

CONFIRMED / REJECTED / UNKNOWN / INCONCLUSIVE

Criterion status PASS / FAIL / UNKNOWN / INCONCLUSIVE is explanatory and does not replace the authoritative validation result.

Formation evidence is bounded by formation_cutoff. Later OUTCOME evidence is permitted only as validation input and does not rewrite Formation.

## Transition separation

Formation, Hypothesis, and Validation use distinct analytical transition domains.

They are not V4 evidence transitions.

Every transition carries:

- previous state
- next state
- reason
- evidence
- temporal context
- rule version
- processing context
- provenance

## Cross-layer linkage

Cross-layer relationships are references, not shared mutable state:

Formation
→ hypothesis.formation_id

Hypothesis
→ validation.hypothesis_id (optional but exact when supplied)

Validation
→ evidence references

No cross-layer link may mutate lower authority.

## Negative guarantees

The implementation must reject:

- hypothesis from non-VALID formation;
- illegal hypothesis state transition;
- invalid validation result;
- authority escalation;
- missing evidence/provenance/temporal context.

## Acceptance

CONTRACT → IMPLEMENTATION → POSITIVE TEST → NEGATIVE TEST → RUNTIME VERIFICATION → RECONCILIATION.
