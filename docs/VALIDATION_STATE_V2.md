# HAHAWEEK — VALIDATION STATE v2

Status: VERIFIED — exact-head CI 34b4f26e02eb79d092936370f9885a771994d03b

## Authoritative validation result vocabulary

Validation result is one of:

- CONFIRMED
- REJECTED
- UNKNOWN
- INCONCLUSIVE

Criterion status remains a local explanatory field:

- PASS
- FAIL
- UNKNOWN
- INCONCLUSIVE

Criterion status does not replace the authoritative validation result.

## Coverage semantics

- COMPLETE + all criteria PASS => CONFIRMED
- COMPLETE + any criterion FAIL => REJECTED
- UNKNOWN coverage or UNKNOWN criterion => UNKNOWN
- PARTIAL coverage or INCONCLUSIVE criterion => INCONCLUSIVE

An unavailable or incomplete validation input must never become REJECTED solely because required evidence was not acquired.

## Temporal boundary

Validation separates the historical formation boundary from the later outcome window.

Every validation must declare:

- formation_cutoff
- evidence_temporal_context

Each temporal context entry declares one or both roles:

- FORMATION — evidence used to establish the historical formation state. Its event_time MUST satisfy event_time <= formation_cutoff.
- OUTCOME — evidence used to evaluate a post-formation historical outcome. It may occur after formation_cutoff because that later evidence is the subject of validation, not evidence used to establish the past formation state.

Evidence may carry both roles when the same event is legitimately both part of formation and the boundary/reference event for the outcome.

This prevents future leakage into formation assessment without incorrectly rejecting the historical outcome window that validation is explicitly designed to measure.

Formation evidence attached to the Formation object must have a corresponding FORMATION temporal role. Evidence referenced by validation must have temporal context. Missing temporal context is an error, not a negative result.

## Identity

Validation identity includes the state vocabulary, rule version, formation cutoff, evidence references, criteria, and temporal evidence context including temporal roles.

Changing temporal context therefore produces a different validation identity.

## Authority

Validation is an analytical projection.

It does not:

- mutate V4 evidence;
- mutate cursor/checkpoint/manifest;
- establish canonicality;
- become evidence;
- activate production authority.
