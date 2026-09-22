# HAHAWEEK — Research Report Contract v0.1

Status: VERIFIED / FROZEN
Step: 432
Verification: PR #75 merged; post-merge Security & Regression #979 and Push on main #416 succeeded.
Main verified at `8a9b5dd2e5b6d73e7312a08c9f51710b6a072b54`.
Scope: MVP `POOL_BOOTSTRAP`

## Purpose

Define the provenance-complete research output at the end of the MVP evidence chain.

Canonical pipeline:

`FORMATION → HISTORICAL OUTCOME → VALIDATION → RESEARCH REPORT`

A report is a derived analytical artifact. It is not a new source of truth.

## Required lineage

A report MUST reference:

- Formation Result
- Historical Outcome
- Validation Result
- evidence IDs supporting its claims

The required lineage is:

`REPORT → VALIDATION → OUTCOME → EVIDENCE ID → RAW EVIDENCE → PROVENANCE`

## Claims

Every material report claim requires:

- stable `claim_id`
- explicit `statement`
- one or more `evidence_ids[]`

Claims MUST NOT introduce facts that cannot be traced to the supplied formation, outcome, validation, or evidence references.

## Identity

Report identity is deterministic from:

- schema version
- report rule version
- formation ID
- outcome ID
- validation ID
- validation result
- canonical claims
- evidence IDs

Processing timestamps are not part of report identity.

## Validation state

The report MUST preserve the validation result exactly:

- `CONFIRMED`
- `REJECTED`
- `INCONCLUSIVE`

The report layer MUST NOT reinterpret `INCONCLUSIVE` as failure or success.

## Immutability boundary

Report generation MUST NOT modify:

- raw evidence
- canonical evidence
- evidence identity
- evidence repository
- Formation Result
- Historical Outcome
- Validation Result
- acquisition cursor
- V4 implementation

## Non-goals

The report contract does not provide:

- predictive scoring
- trading recommendations
- profitability ranking
- automated execution
- autonomous publication

## Acceptance

1. Report lineage is complete.
2. Claims have evidence references.
3. Formation, outcome, and validation identifiers agree.
4. Validation result is preserved without reinterpretation.
5. Identical inputs produce identical report identity.
6. Report generation does not mutate authoritative evidence.
