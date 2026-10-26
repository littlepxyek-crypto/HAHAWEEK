# STEP 543 — F-03 Stale/Conflicting Authority Binding Contract v0.1

## Purpose

Define narrow evidence requirements for rejecting stale or conflicting production authority records at the F-03 boundary.

## Required behavior

1. Authority generation continuity must remain monotonic and fail closed on generation conflict.
2. Cursor authority must not regress.
3. A successor authority record must preserve the same segment identity, manifest digest, and checkpoint digest unless an explicitly authorized generation transition exists.
4. A record with changed segment, manifest, or checkpoint binding at the same generation must fail closed.
5. Missing authority remains fail closed.
6. The evidence must execute at the production ingestion authority boundary or the directly invoked boundary used by production ingestion.
7. Recovery of the same persisted authority must remain deterministic.
8. No silent authority replacement is permitted.
9. No V4 production activation, live RPC changes, cursor reset, historical rewrite, or schema migration is part of this step.

## Acceptance evidence

- Same-generation identical binding is accepted.
- Same-generation changed segment binding is rejected.
- Same-generation changed manifest binding is rejected.
- Same-generation changed checkpoint binding is rejected.
- Generation conflict and cursor regression remain rejected.
- Existing F-03 tests remain green.
