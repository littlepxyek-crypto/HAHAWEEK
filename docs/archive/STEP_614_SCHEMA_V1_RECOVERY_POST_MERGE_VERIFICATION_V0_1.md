# STEP 614 — Schema v1 Recovery Post-Merge Verification v0.1

## Merge verification

- Implementation PR: #574.
- Implementation merge commit: `55318e3964ea4ed8a2cd0d3a218c0b7c8331c212`.
- Main branch contains the schema-v1 recovery implementation.
- F-614-03 is implemented in `src/core/database.js`.
- Regression fixture: `tests/database-schema-v1-recovery.test.js`.

## CI

PR-head commit `1445bfba3e540e5fcbef0350fa430bed2ec1795b`:
- HAHAWEEK Tests: SUCCESS.
- HAHAWEEK Security and Regression: SUCCESS.
- Test workflow included npm test, verify:v4, and verify:v4:coverage.
- Security workflow included tests, dependency audit, and tracked-secret detection.

No exact merge-commit workflow run is claimed because repository workflow lookup for `55318e3964ea4ed8a2cd0d3a218c0b7c8331c212` returned no associated runs/statuses.

## Code boundary verification

The merged implementation:
- accepts schema version 1 only after validating the legacy base schema;
- adds only repository-defined raw location columns and canonical_evidence structure;
- migrates to schema v3 transactionally;
- continues through the existing v3→v8 migration chain;
- preserves legacy rows;
- fails closed on malformed legacy schema;
- does not modify cursor/state.json or authority semantics.

## Operator gate

Actual operator recovery is still pending. The operator must update to the merged main code and exercise the existing `./bin/hahaweek scan` procedure against the preserved schema-v1 database.

Global LIVE-READINESS remains NOT READY / BLOCKED until actual runtime recovery and recovery verification are evidenced.
