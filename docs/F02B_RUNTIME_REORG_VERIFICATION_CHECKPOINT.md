# F-02B Runtime Reorg Verification Checkpoint

Status: **IMPLEMENTED — PROVIDER-INDEPENDENT FIXTURE; RUNTIME INTEGRATION STILL OPEN**

## Scope

This checkpoint adds an executable, provider-independent reorg boundary fixture. It does not modify production ingestion, SQLite state, cursor authority, migration, or V4 production authority.

## Verified behaviors

- Historical canonical evidence is preserved when a reorg orphans it.
- Replacement evidence receives its own identity.
- Duplicate replay is idempotent.
- Same identity with a different digest is an integrity conflict.
- Cursor remains unchanged until the evidence transition is committed.
- Restart restores canonical/orphaned state.
- Crash before cursor commit can safely replay the evidence state.
- Repeated orphaning of already-orphaned evidence is rejected.

## Explicit limitation

This fixture is an executable protocol-boundary model, not proof of the current production runtime's reorg behavior. Production integration remains a separate F-02C requirement and must prove the same invariants against the actual persistence/ingestion boundary.

Design Gate 2 remains **OPEN**.
