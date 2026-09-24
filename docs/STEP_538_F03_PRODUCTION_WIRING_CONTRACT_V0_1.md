# STEP 538 — F-03 Production Wiring Contract v0.1

## Objective
Wire the complete F-03 authority record into the existing HAHAWEEK production ingestion boundary without activating V4 globally.

## Required behavior
1. `src/index.js` must construct the complete authority record for each processed range.
2. The ingestion boundary must validate the complete record, not only `checkpointCommitted`.
3. Segment identity, manifest digest, checkpoint digest, generation, and cursor block must be present.
4. Binding and continuity validation must occur before cursor advancement.
5. Missing, malformed, mismatched, conflicting, or regressing authority must fail closed.
6. Existing evidence persistence must complete before authority authorization and cursor advancement.
7. Restart must preserve the persisted authority generation/cursor relationship.
8. Existing constructor compatibility must not silently weaken the new production path.
9. Tests must exercise `src/index.js` production wiring and the ingestion boundary.

## Constraints
- No V4 global activation.
- No historical rewrite.
- No cursor reset.
- No RPC/provider change.
- No SQLite schema migration.
- No new authority semantics beyond the already contracted record.

## Exit
Implementation may proceed only against this contract. F-03 remains CONDITIONAL until implementation, CI, recovery evidence, and independent audit all pass.
