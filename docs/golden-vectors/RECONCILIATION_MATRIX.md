# STEP 71D — Normative Fixture Reconciliation Matrix

Status: IN PROGRESS / REFERENCE-ONLY

| Artifact | F-01 reference | Normative reconciliation | Fixture promotion |
|---|---|---|---|
| EVENT_IDENTITY | PASS | exact identity fields/domain reviewed | pending canonical fixture |
| TRANSITION_IDENTITY | PASS | exact identity fields/domain reviewed | pending canonical fixture |
| REORG_OBSERVATION | PASS | exact identity fields/domain reviewed | pending canonical fixture |
| ACQUISITION_IDENTITY | PASS | exact identity fields/domain reviewed | pending canonical fixture |
| SEGMENT | PASS | field/hash encoding requires reconciliation | BLOCKED |
| MANIFEST | PASS | identity model reviewed; envelope still required | pending canonical fixture |
| CHECKPOINT | PASS | F-01 identity differs from frozen normative model | BLOCKED |
| CURSOR | PASS | F-01 identity differs from frozen normative model | BLOCKED |
| LEASE | PASS | exact identity fields/domain reviewed | pending canonical fixture |
| MIGRATION | PASS | exact identity fields/domain reviewed | pending canonical fixture |
| MIGRATION_MANIFEST | PASS | self-hash/envelope rules require reconciliation | BLOCKED |
| BACKUP | PASS | exact identity fields/domain reviewed | pending canonical fixture |

## Promotion rule

A reference vector is promoted only after:
1. identity fields exactly match the frozen normative protocol;
2. domain is exact;
3. canonical serialization bytes are available;
4. expected hash is independently reproducible;
5. at least one deterministic negative mutation is rejected;
6. no production authority is introduced.

## Current blocker

The repository reference serializer is JCS-like and must not be represented as full RFC 8785 conformance without independent verification.

## Next executable work

Resolve the four blocked artifact families first, then materialize the promoted fixtures and build the unified offline verifier against the fixture index.
