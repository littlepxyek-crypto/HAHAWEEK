# HAHAWEEK — F-03 Final Authority Audit V0.1

## Audit date

2026-09-20

## Scope

Final audit of the F-03 checkpoint/cursor authority boundary on branch `feat/f03-v4-production-integration`.

## Result

**CONDITIONAL — F-03 NOT CLOSED**

The V4 authority boundary and recovery behavior are strongly covered by executable regression tests, but production authority cutover is not yet proven.

## Verified evidence

- CI Run #306: 239 tests, 238 passed, 0 failed, 1 skipped.
- npm audit: 0 vulnerabilities.
- tracked-secret baseline: PASS.
- Processor failure rollback: PASS.
- Authority failure rollback: PASS.
- V4 atomic evidence + authority + cursor commit: PASS.
- V4 persistent restart recovery: PASS.
- Cursor regression rejection: PASS.
- Missing/mismatched authority context fails closed: PASS.

## Production-path audit

### 1. Production V4 activation

**NOT ACTIVE.**

`src/index.js` still constructs the legacy `BlockCursor` and passes it to `IngestionEngine` without a V4 cursor adapter.

### 2. Production authority source

**NOT CLOSED.**

The production path does not yet load persisted V4 manifest/checkpoint authority records before constructing the ingestion cursor.

The current V4 tests use explicit authority fixtures supplied to the adapter. These tests prove the adapter boundary, not the existence of a production manifest/checkpoint persistence source.

### 3. Legacy persistence interaction

**OPEN RISK.**

The production processor and processorRange call `database.save()` directly. The V4 IngestionEngine path holds a SQLite transaction across the processor and cursor advance. V4 production activation must reconcile this save behavior before cutover.

### 4. Cursor authority

**VALIDATED AT ADAPTER BOUNDARY.**

The V4 adapter validates the supplied manifest/checkpoint/cursor authority chain and rejects mismatches or missing authority context.

### 5. Atomicity

**VALIDATED FOR THE OPT-IN V4 PATH.**

Evidence, authority record, and cursor are committed in the same database transaction. Processor and authority failures roll back the transaction.

### 6. Restart recovery

**VALIDATED FOR THE PERSISTED V4 AUTHORITY/CURSOR PATH.**

The integration test closes and reopens the database, reloads the persisted authority record and cursor, and resumes from the exact persisted position without replaying the prior block.

This does not by itself prove production manifest/checkpoint persistence because the test authority context is still supplied as an explicit validated fixture.

## Required closure work

F-03 must remain open until the following are implemented and tested against the actual production path:

1. Persisted V4 manifest/checkpoint authority records exist as authoritative inputs.
2. Production startup loads and verifies that authority chain before accepting the cursor.
3. Production acquisition position mapping is explicitly validated.
4. Legacy `state.json` / `BlockCursor` cannot silently outrank V4 authority after cutover.
5. Production `database.save()` semantics are reconciled with the V4 transaction boundary.
6. A production-path restart test proves recovery from persisted manifest → checkpoint → cursor state.
7. A production-path authority failure test proves no partial evidence/cursor commit.
8. Full CI/security regression remains green after those changes.

## Safety decision

Do **not** merge PR #39 as the production cutover.

Do **not** mark PR #39 ready.

Do **not** enable V4 in `src/index.js` yet.

The current branch is suitable as a validated integration boundary and regression evidence layer, but it is not yet evidence that production authority has been cut over safely.

## Relation to Design Gate 2

This audit does not change Gate 2 status. `docs/DESIGN_GATE_2_STATE.md` remains NOT PASSED.

## Principle

**Tests prove the isolated boundary. Production cutover requires proving the same authority chain exists in the real acquisition/recovery path.**
