# STEP 606 — Analysis V0.1

## Purpose
Repository-grounded analysis of failure-atomicity across lifecycle persistence, final authority validation, and cursor advancement before any V4 production activation.

## Baseline
Analysis branch is based on post-reconciliation merge 6b95130e4c51ccc6e3ace8406881018d77c80cb0.

## Evidence inspected

### Runtime cursor boundary
src/core/ingestion.js shows the batch path: processorRange resolves, then authorityGate is called, then cursor.advance(toBlock) is called only if the authority gate returns without throwing. Therefore an authority-gate rejection prevents cursor advancement in the synchronous failure path.

### Lifecycle durability boundary
src/core/production-authority-lifecycle.js shows:
- prepare validates verified processing context, expected authority, writer-fence ownership, deterministic lifecycle identity, and reorg predecessor requirements.
- commit re-prepares and compares the prepared identity/authority/lineage before persistence.
- new lifecycle state is inserted as DURABLY_ESTABLISHED.
- database.save() occurs before the function returns.
- the persisted row is read back and its complete provenance/commitment fields are validated.
- ordinary exceptions restore the database snapshot.
- existing lifecycle identity is validated in full rather than silently normalized.
- REORG_REPLACEMENT requires exactly one durable predecessor for the referenced parent result.

### Persistence/cursor separation
Lifecycle persistence uses the lifecycle database, while BlockCursor persistence uses saveState() in the state file. These are distinct durable boundaries. The current runtime therefore proves ordering in the normal synchronous path, but does not by itself prove crash-atomicity across both durable stores.

### Restart/recovery
BlockCursor reloads persisted cursor state and rejects cursor regression. Lifecycle persistence preserves an established row and validates it on re-use. However, the inspected evidence does not establish an integrated crash/restart test covering lifecycle database durability followed by process crash before cursor durability.

### Reorg/replacement
The lifecycle implementation preserves predecessorLifecycleId and requires an unambiguous predecessor for REORG_REPLACEMENT. Complete crash/restart/reorg combination is not yet proven.

### Concurrency/writer fence
Lifecycle preparation and commit assert existing writer-fence ownership at preparation, pre-write, and post-write/readback boundaries. This proves local ownership checks but not the full cross-store crash/concurrency matrix.

## State / ordering matrix

| Boundary | Evidence | Result |
|---|---|---|
| Processing succeeds | processorRange resolves before authority gate | Proven for normal path |
| Final authority gate rejects | authorityGate throws before cursor advance | Proven for synchronous path |
| Lifecycle prepared | Verified context, expected authority, binding, identity and predecessor checks | Proven |
| Lifecycle durable | DB insert + save + readback validation | Proven for normal persistence path |
| Cursor durable | cursor.advance writes state file | Proven for cursor operation |
| Lifecycle durable → cursor durable as one atomic transaction | Separate persistence mechanisms | NOT PROVEN |
| Crash between lifecycle save and cursor save | No integrated crash test found in inspected evidence | NOT PROVEN |
| Restart with lifecycle ahead of cursor | Cursor reload exists; integrated scenario not proven | NOT PROVEN |
| Reorg predecessor | Exactly-one predecessor required for replacement | Proven at lifecycle boundary |
| Writer ownership | Existing fence asserted around lifecycle operations | Proven locally |
| Full crash + reorg + concurrency | No integrated proof in inspected evidence | NOT PROVEN |
| Expected vs production authority | Expected authority separately validated and persisted as expected fields | Boundary preserved |
| Surveillance authority | No production authority granted by this Analysis | Preserved |

## Failure points and fail-closed outcomes
1. Invalid processing context → reject before lifecycle persistence.
2. Invalid expected authority/range/generation/cursor binding → reject before lifecycle persistence.
3. Missing or ambiguous reorg predecessor → reject before lifecycle persistence.
4. Prepared lifecycle conflict → reject before lifecycle persistence.
5. Lifecycle persistence/readback conflict → restore database snapshot and reject.
6. Writer-fence loss → reject; cursor advancement is not reached in the synchronous runtime path.
7. Authority-gate exception → cursor advancement is not reached.
8. Process crash after lifecycle database durability but before cursor durability → complete recovery protocol is not yet proven; this remains a Design gap and V4 stays blocked.

## Operator Acceptance
Current repository evidence supports inspection of persisted lifecycle records and cursor state through existing code paths, but this Analysis does not invent new operator commands or recovery procedures.
The unresolved operator concern is deterministic handling and verification of a crash state where lifecycle durability may precede cursor durability. Design is required to define the smallest repository-grounded boundary and tests without changing frozen semantics.

## Surveillance
Surveillance remains derived, evidence-linked, versioned, and non-authoritative. It does not mutate raw/canonical evidence, advance the cursor, create authority, or perform automated action/trading. No actor/ownership inference is introduced; ADDRESS ≠ ACTOR. No temporal leakage or scoring/risk authority is introduced.

## Conclusion
Failure-atomicity is not yet proven end-to-end.
The normal synchronous ordering is evidenced as: processing → final authority gate → cursor advance.
Lifecycle persistence has deterministic identity, provenance validation, writer-fence checks, durable readback, and snapshot rollback on ordinary exceptions.
The remaining material gap is crash atomicity across lifecycle database durability → cursor state-file durability, together with integrated restart/reorg/concurrency evidence.
No V4 production activation is authorized. Gate 2 remains PASS, while V4 production authority remains INACTIVE / BLOCKED.

## Smallest safe Design boundary
The next phase is STEP 606 Design, limited to defining repository-grounded failure-atomicity evidence and recovery semantics for the existing lifecycle/cursor boundary. It must not change frozen lifecycle schema/identity/binding, cursor semantics, writer-fence ownership, raw/canonical evidence, or Surveillance authority unless a separate contract explicitly authorizes such a change.
No production implementation is authorized by this Analysis alone.