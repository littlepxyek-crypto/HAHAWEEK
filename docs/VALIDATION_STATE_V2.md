# HAHAWEEK — VALIDATION STATE v2

Status: IMPLEMENTED / CI VERIFICATION REQUIRED

## Authoritative validation result vocabulary

Validation result is one of:

- CONFIRMED
- REJECTED
- UNKNOWN
- INCONCLUSIVE

The previous split between a result vocabulary and a separate PASS/FAIL
interpretation is not used for the authoritative validation result.

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

An unavailable or incomplete validation input must never become REJECTED
solely because required evidence was not acquired.

## Temporal boundary

Every validation must declare:

- formation_cutoff
- evidence_temporal_context

Every evidence item contributing to the validation must have an event_time
and must satisfy:

event_time <= formation_cutoff

Evidence after the formation cutoff is rejected with
FUTURE_EVIDENCE_RELATIVE_TO_FORMATION_CUTOFF.

This prevents validation from using future evidence to alter the historical
formation assessment.

## Identity

Validation identity includes the state vocabulary, rule version, formation
cutoff, evidence references, criteria, and temporal evidence context.

Changing temporal context therefore produces a different validation identity.

## Authority

Validation is an analytical projection.

It does not:

- mutate V4 evidence;
- mutate cursor/checkpoint/manifest;
- establish canonicality;
- become evidence;
- activate production authority.
