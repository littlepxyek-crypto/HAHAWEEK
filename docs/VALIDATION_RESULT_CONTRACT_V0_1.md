# HAHAWEEK — Validation Result Contract v0.1

Status: VERIFIED / FROZEN
Step: 430
Scope: MVP `POOL_BOOTSTRAP`

## Purpose

Define the immutable boundary that evaluates a fixed Formation Result against a Historical Outcome using a versioned validation rule.

Canonical boundary:

`FORMATION → HISTORICAL OUTCOME → VALIDATION RESULT → REPORT`

## Required inputs

- Formation Result
- Historical Outcome
- versioned validation rule
- one or more criterion results

## Required Validation Result fields

- `validation_id`
- `formation_id`
- `formation_rule_version`
- `outcome_id`
- `outcome_rule_version`
- `validation_rule_version`
- `result`
- `criteria_results[]`
- `evidence_ids[]`
- `uncertainties[]`
- `provenance_reference`

## Allowed results

- `CONFIRMED`
- `REJECTED`
- `INCONCLUSIVE`

## Core rules

1. Validation consumes a fixed Formation Result and Historical Outcome.
2. Formation and Outcome identifiers and rule versions MUST match the supplied objects.
3. Every criterion has a stable identifier, status, and evidence references.
4. A failed criterion yields `REJECTED`.
5. If no criterion fails but coverage is `PARTIAL` or `UNKNOWN`, the result is `INCONCLUSIVE`.
6. An explicitly `INCONCLUSIVE` criterion yields `INCONCLUSIVE`.
7. Complete coverage with all criteria passing yields `CONFIRMED`.
8. `UNKNOWN ≠ FALSE`; insufficient evidence is not silently converted to rejection.
9. Validation identity is deterministic from the versioned rule, fixed inputs, criteria, evidence, and uncertainties.
10. Processing timestamps are not part of validation identity.

## Traceability

Material validation claims MUST retain:

`VALIDATION → OUTCOME → EVIDENCE ID → RAW EVIDENCE → PROVENANCE`

## Immutability and boundaries

Validation MUST NOT:

- modify raw evidence
- modify canonical evidence
- modify evidence identity
- modify Formation Result
- modify Historical Outcome
- delete contradictory evidence
- advance acquisition cursors
- silently normalize missing evidence
- perform trading execution
- create a predictive score

A changed interpretation creates a new versioned validation result.

## Coverage

Coverage comes from Historical Outcome. Validation does not reinterpret missing evidence as failure.

## No-look-ahead

Validation consumes an already fixed Historical Outcome. It cannot feed its result backward into formation detection or alter the observation window after evaluation.

## Non-goals

This contract does not define trading strategy, price prediction, profitability ranking, autonomous execution, or production V4 cutover.

## Status discipline

`DESIGNED ≠ EXECUTED ≠ VERIFIED ≠ FROZEN`
