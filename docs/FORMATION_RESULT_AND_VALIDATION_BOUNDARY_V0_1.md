# HAHAWEEK — Formation Result & Historical Validation Boundary v0.1

Status: REFERENCE / DESIGN CANDIDATE  
Step: 414  
Scope: MVP `POOL_BOOTSTRAP`

## 1. Purpose

Define the hard boundary between formation detection and historical validation.

Canonical pipeline:

`FORMATION DETECTION → HISTORICAL OUTCOME → VALIDATION → REPORT`

Formation detection answers what formation was observed and what evidence establishes it.

Historical validation answers what happened after the formation according to a pre-defined evaluation window and validation rule.

Validation MUST NOT modify the original formation evidence.

## 2. Formation Result

A Formation Result is the reproducible analytical result of applying a versioned formation rule to authoritative evidence.

Minimum fields:

- `formation_id`
- `formation_type`
- `formation_rule_version`
- `chain_id`
- `formation_start`
- `formation_end`
- `state`
- `evidence_ids[]`
- `graph_reference`
- `provenance_reference`
- `created_at`

For `POOL_BOOTSTRAP`:

`POOL_CREATED → LIQUIDITY_ADDED → FIRST_SWAP`

The Formation Result records observation. It is not a prediction.

## 3. Historical Outcome

Historical Outcome is derived only from evidence occurring after the formation boundary.

Minimum fields:

- `outcome_id`
- `formation_id`
- `outcome_rule_version`
- `observation_start`
- `observation_end`
- `observations[]`
- `coverage_status`
- `evidence_ids[]`
- `provenance_reference`

The observation window MUST be defined by the versioned validation contract.

Future evidence MUST NOT be used to alter formation detection.

## 4. Validation Result

Validation evaluates a Formation Result against a Historical Outcome using a versioned validation definition.

Allowed results:

- `CONFIRMED`
- `REJECTED`
- `INCONCLUSIVE`

`INCONCLUSIVE` is required when evidence or coverage is insufficient to distinguish the alternatives.

Minimum fields:

- `validation_id`
- `formation_id`
- `formation_rule_version`
- `outcome_rule_version`
- `validation_rule_version`
- `result`
- `criteria_results[]`
- `evidence_ids[]`
- `uncertainties[]`
- `provenance_reference`

## 5. No Look-Ahead Leakage

Prohibited:

`FUTURE OUTCOME → FORMATION DETECTION`

Required direction:

`FORMATION → FIXED EVALUATION DEFINITION → FUTURE OBSERVATION → VALIDATION`

A validation rule MUST be versioned before evaluation.

Changing a validation rule creates a new validation version; it does not rewrite historical formation evidence.

## 6. Coverage and Unknown

Insufficient historical coverage does not automatically imply failure.

Examples:

- missing RPC range → `INCONCLUSIVE`
- partial observation window → `INCONCLUSIVE`
- complete observation with criterion failure → `REJECTED`
- complete observation satisfying criteria → `CONFIRMED`

Core principle:

`UNKNOWN ≠ FALSE`

## 7. Evidence Traceability

Every material validation claim MUST be traceable:

`VALIDATION → OUTCOME → EVIDENCE ID → RAW EVIDENCE → PROVENANCE`

A derived metric without reconstructable evidence is insufficient for an evidence-backed validation result.

## 8. Immutability

Validation MUST NOT:

- modify raw evidence
- modify canonical evidence
- modify evidence identity
- rewrite formation timestamps
- delete contradictory evidence
- advance acquisition cursors
- silently normalize missing data

A new interpretation requires a new versioned analytical result.

## 9. MVP Acceptance

For one `POOL_BOOTSTRAP` formation:

1. Formation Result is reproducible from authoritative evidence.
2. Formation evidence is immutable and traceable.
3. Historical evaluation boundaries are explicit.
4. Historical Outcome is reproducible.
5. Validation rule version is recorded.
6. Validation result is `CONFIRMED`, `REJECTED`, or `INCONCLUSIVE`.
7. Material claims have evidence references.
8. Insufficient coverage cannot be silently converted into rejection.
9. Future evidence cannot leak into formation detection.
10. A research report can reconstruct the complete chain.

## 10. Non-Goals

This contract does not define trading strategy, price prediction, profitability ranking, automated execution, autonomous publication, or production V4 cutover.

## 11. Status

Design contract only.

`DESIGNED ≠ EXECUTED ≠ VERIFIED ≠ FROZEN`

Implementation and tests must be performed and verified separately.
