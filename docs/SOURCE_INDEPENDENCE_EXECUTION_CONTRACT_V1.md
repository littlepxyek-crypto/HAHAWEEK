# HAHAWEEK — SOURCE INDEPENDENCE EXECUTION CONTRACT V1

Status: VERIFIED / RECONCILED

## Classes
- I0 UNKNOWN
- I1 DERIVED / SAME LINEAGE
- I2 CORRELATED
- I3 INDEPENDENT
- I4 DIRECTLY INDEPENDENT

Source count is never treated as source independence.

## Executable semantics
Each evidence line requires source_id, source_lineage_id, and acquisition_id. Same lineage is I1. Explicit correlation is I2. Two separately classified I3 sources form an I3 independent pair. I4 requires explicit direct-independence proof on both sources.

This contract is deliberately conservative: missing independence metadata yields I0 rather than independence.

## Negative vectors
Tests reject same-lineage evidence, correlated evidence, unknown evidence, and multiple observations from one lineage even when the raw source count is greater than two.

## Non-authority
The contract classifies evidence relationships. It does not mutate canonical evidence or V4 authority.

## Remaining risk
Integration with actual acquisition/source lineage metadata and claim/formation thresholds remains open.
