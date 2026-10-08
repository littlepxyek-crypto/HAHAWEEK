# HAHAWEEK — F-03 Authority Audit V0.1

Date: 2026-09-20

## Scope
Audit the executable relationship between:

SEGMENTS → MANIFEST → CHECKPOINT → CURSOR

against the current HAHAWEEK production path and the V4 golden-vector reference tests.

## Result

**F-03 remains CONDITIONAL / NOT CLOSED.**

PR #37 successfully adds crash/recovery and adversarial regression coverage, but those tests validate the V4 reference model. They do not yet make the production BlockCursor implementation authoritative through a persisted V4 checkpoint/manifest chain.

## Findings

### F03-A1 — Cursor persistence is independent

Current production cursor implementation is src/core/block-cursor.js.

BlockCursor.advance() writes lastProcessedBlock through the generic state store. It does not require a valid V4 checkpoint or manifest commitment before advancing.

Therefore the production path does not currently enforce:

SEGMENTS → MANIFEST → CHECKPOINT → CURSOR

at the cursor boundary.

### F03-A2 — Runtime state is separate from V4 checkpoint authority

src/core/state.js persists state.json atomically using a temporary file and rename.

This provides useful filesystem-level state persistence, but the state file is not itself a V4 checkpoint artifact and is not cryptographically bound to a manifest.

### F03-A3 — Database persistence is separate

src/core/database.js persists the SQLite database through export → temporary file → rename.

The current schema contains ingestion_state, but the production database path does not yet demonstrate a V4 manifest/checkpoint authority chain.

### F03-A4 — Golden-vector validator is reference-only

tests/checkpoint-cursor-recovery-golden.test.js correctly models the V4 contract and fail-closed cases.

However, its checkpointResult(), cursorResult(), and recoveryResult() functions are test/reference logic. They are not currently the production authority used by BlockCursor or IngestionEngine.

## What PR #37 proves

CI on commit 83c989d passed:

- 202 tests
- 201 passed
- 0 failed
- 1 skipped
- dependency audit: 0 vulnerabilities
- F-03 crash boundary regression: PASS
- F-03 adversarial matrix coverage: PASS

These results establish strong regression coverage for the tested scenarios.

## What remains required before F-03 can become PASS

1. Define the executable V4 checkpoint/manifest authority interface.
2. Bind cursor advancement to a valid committed checkpoint.
3. Verify manifest/segment integrity before recovery resume.
4. Add production-path negative tests proving cursor advancement is rejected when checkpoint authority is missing, stale, malformed, mismatched, or ahead/invalid.
5. Add crash tests around the actual production commit ordering.
6. Keep the current reference/golden-vector tests as compatibility evidence.

## Safety decision

Do not modify or migrate production evidence/state as part of this audit.

Do not claim Gate 2 or F-03 is closed.

The correct next engineering phase is to implement the V4 authority boundary in an isolated, testable layer before connecting it to the production cursor.

## Historical preservation

This document records an audit finding and does not replace or overwrite prior specifications or decisions.