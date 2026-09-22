# HAHAWEEK — Validation Integration Boundary v0.1

Status: VERIFIED / FROZEN
Step: 431
Verification: PR #73 merged; post-merge Security & Regression #968 and Push on main #412 succeeded.
Main verified at `91dae39e53a0243fc210472ce1287ffe9545c8ca`.
Scope: MVP `POOL_BOOTSTRAP`

## Purpose

Define the executable boundary that connects a fixed Formation Result and a fixed Historical Outcome to the existing Validation Result contract.

Canonical boundary:

`FORMATION RESULT → HISTORICAL OUTCOME → VALIDATION BOUNDARY → VALIDATION RESULT`

## Rules

1. The Formation Result MUST be supplied as an object with a stable `formation_id` and `formation_rule_version`.
2. A Formation Result supplied to this boundary MUST have state `VALID` when the state field is present.
3. Historical Outcome MUST reference the same `formation_id`.
4. Historical Outcome MUST reference the same `formation_rule_version`.
5. The boundary MUST delegate result semantics to the frozen Validation Result contract; it MUST NOT implement a second validation algorithm.
6. Historical Outcome coverage semantics remain authoritative: `PARTIAL` or `UNKNOWN` cannot become rejection merely because a criterion fails.
7. Validation Result remains immutable and traceable through its evidence references.
8. The boundary MUST NOT modify Formation Result, Historical Outcome, raw evidence, canonical evidence, evidence identity, repository authority, acquisition cursor, or V4 implementation.
9. The boundary does not perform prediction, scoring, trading, or publication.
10. A changed Formation Result, Outcome, or validation rule produces a distinct validation result through the existing deterministic identity.

## Error conditions

- `INPUT_REQUIRED`
- `FORMATION_REQUIRED`
- `OUTCOME_REQUIRED`
- `FORMATION_ID_REQUIRED`
- `FORMATION_RULE_VERSION_REQUIRED`
- `OUTCOME_ID_REQUIRED`
- `OUTCOME_RULE_VERSION_REQUIRED`
- `FORMATION_NOT_VALID`
- `OUTCOME_FORMATION_ID_MISMATCH`
- `OUTCOME_FORMATION_RULE_VERSION_MISMATCH`

## Non-goals

This boundary does not replace the frozen Formation Result, Historical Outcome, or Validation Result contracts and does not introduce a new validation identity system.
