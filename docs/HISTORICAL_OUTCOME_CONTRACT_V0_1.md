# HAHAWEEK — Historical Outcome Contract v0.1

Status: VERIFIED / FROZEN
Step: 429
Scope: MVP `POOL_BOOTSTRAP`

## Purpose

Define the reproducible boundary between an observed Formation Result and the
future evidence used for historical evaluation.

Canonical boundary:

`FORMATION → FIXED OUTCOME DEFINITION → FUTURE OBSERVATION → HISTORICAL OUTCOME`

## Required fields

- `outcome_id`
- `formation_id`
- `formation_rule_version`
- `outcome_rule_version`
- `observation_start`
- `observation_end`
- `observations[]`
- `coverage_status`
- `evidence_ids[]`
- `provenance_reference`

## Rules

1. The outcome is derived from a fixed Formation Result; it does not rewrite formation data.
2. `observation_start` MUST NOT precede `formation_end`.
3. Every observation MUST fall within the declared observation window.
4. Every observation retains its evidence ID.
5. `coverage_status` is explicit: `COMPLETE`, `PARTIAL`, or `UNKNOWN`.
6. Partial or unknown coverage is not silently converted into failure.
7. `outcome_id` is deterministic from the versioned outcome definition and observed evidence set.
8. Processing timestamps are not evidence and do not alter outcome identity.
9. Historical Outcome does not perform validation; it supplies the historical observation set to the next layer.
10. Raw evidence, canonical evidence, evidence identity, repository authority, cursor, and V4 implementation are untouched.

## No-look-ahead boundary

Historical Outcome may only consume evidence at or after the Formation Result's
`formation_end` boundary. Evidence before that boundary belongs to formation
or earlier context and cannot be silently reclassified as future outcome evidence.

## Reproducibility

Given the same Formation Result, outcome rule version, observation window,
coverage status, and authoritative evidence observations, the same
`outcome_id` must be produced.

## Non-goals

This contract does not define a validation result, prediction, trading strategy,
score, or production ingestion behavior.
