# STEP 534 — F-03 Production Authority Integration Contract v0.1

## Objective
Define executable evidence required to replace the current narrow checkpoint boolean at the HAHAWEEK ingestion boundary with a complete authority-record validation path, without activating V4 globally.

## Required evidence
1. The actual ingestion boundary receives a complete persisted authority record.
2. The record binds segment identity, manifest digest, checkpoint digest, generation, and cursor block.
3. Missing or malformed records fail closed.
4. Manifest/checkpoint mismatches fail closed.
5. Generation conflicts and cursor regression fail closed.
6. Authority failure occurs before cursor advancement.
7. Successful authority validation permits cursor advancement only after required evidence persistence.
8. Restart/recovery reuses the same persisted authority and remains deterministic.
9. Tests exercise the current ingestion production boundary, not only helper functions.

## Explicit non-goals
- No V4 global activation.
- No RPC/provider replacement.
- No cursor reset.
- No historical rewrite.
- No SQLite migration.
- No new authority state, hash, or sequence semantics.

## Exit condition
F-03 may be considered VERIFIED only when the implementation and tests demonstrate all required evidence above at the actual ingestion boundary and the result is independently audited.
