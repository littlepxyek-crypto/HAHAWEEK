# HAHAWEEK — SOURCE INDEPENDENCE EXECUTION CONTRACT V1

Status: VERIFIED / RECONCILED — current-head CI/runtime verified

## Classes
- I0 UNKNOWN
- I1 DERIVED / SAME LINEAGE
- I2 CORRELATED
- I3 INDEPENDENT
- I4 DIRECTLY INDEPENDENT

Source count is never treated as source independence.

## Executable semantics
Each evidence line requires source_id, source_lineage_id, and acquisition_id. Same lineage is I1. Explicit correlation is I2. I3 requires two separately classified sources plus an explicit HAHAWEEK independence assessment: `independence_assessed=true`, non-empty `independence_basis`, and `independence_rule_version`. A provider/source declaration alone is insufficient. I4 requires explicit direct-independence proof on both sources. This is an HAHAWEEK evidence-relationship classification, not a universal mathematical proof of independence.

This contract is deliberately conservative: missing lineage, assessment basis, assessment rule version, or assessment flag yields I0 rather than independence. Provider count and provider-declared labels do not establish independence.

## Negative vectors
Tests reject same-lineage evidence, correlated evidence, unknown evidence, and multiple observations from one lineage even when the raw source count is greater than two.

## Non-authority
The contract classifies evidence relationships. It does not mutate canonical evidence or V4 authority.

## Remaining risk
Integration with actual acquisition/source lineage metadata and claim/formation thresholds remains open.


## Root semantic boundary

`I3 INDEPENDENT` means independently assessed under this contract and its declared rule version. It does not mean that HAHAWEEK has established metaphysical or universal independence of the underlying external sources. `I4 DIRECTLY INDEPENDENT` requires the explicit direct proof fields and remains relation-specific.
