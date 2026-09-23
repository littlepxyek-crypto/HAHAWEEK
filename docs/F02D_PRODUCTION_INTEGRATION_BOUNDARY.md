# F-02D Production Integration Boundary

Status: DESIGN-ONLY — NOT RUNTIME-ACTIVE

## Purpose
Define the smallest safe boundary between the verified F-02D block-identity/reorg contracts and the existing ingestion engine. This document does not activate V4 or change production behavior.

## Current runtime constraint
The current ingestion cursor is block-number based. It does not persist authoritative block hash/parent hash. Therefore the reorg detector MUST NOT be wired directly into cursor advancement without an identity acquisition and reconciliation boundary.

## Required flow
RPC acquisition
→ authoritative block identity
→ identity validation/classification
→ runtime reorg boundary
→ evidence processing
→ durable evidence commit
→ cursor advancement

## Invariants
1. A block number alone is never treated as authoritative block identity.
2. A legacy number-only cursor may bind only to authoritative identity with the same block number.
3. A mismatched authoritative block requires explicit reconciliation and must not advance the cursor.
4. CONTINUOUS may permit processing.
5. REORG_DETECTED stops processing at the boundary and preserves existing evidence/cursor state.
6. Invalid or missing identity fails closed.
7. Evidence must be durably committed before cursor advancement.
8. Same identity + same digest may be idempotent; same identity + different digest is a conflict.
9. The detector and boundary adapter do not delete, rollback, canonicalize, or mutate evidence.
10. Legacy compatibility remains explicit; no fabricated hashes or silent migration.

## Integration shape
The future runtime adapter should accept authoritative previous and current block identities and return only a boundary decision. Ownership of evidence, persistence, cursor state, and recovery remains with the ingestion/persistence layer.

The first runtime implementation should be additive and test-gated. It must preserve the existing legacy path until identity acquisition, reconciliation, persistence, and recovery are proven executable.

## Acceptance tests before runtime activation
- continuous adjacent blocks permit continuation;
- parent mismatch stops before cursor advancement;
- non-adjacent/malformed identity fails closed;
- legacy cursor binds only to matching authoritative identity;
- evidence survives reorg detection;
- failed evidence commit cannot advance cursor;
- restart cannot advance beyond the last durable evidence boundary;
- replay is idempotent;
- conflicting identity/evidence is isolated rather than ignored.

## Explicit non-goals
This boundary does not authorize:
- V4 production cutover;
- deletion or rollback of historical evidence;
- automatic legacy migration;
- production canonical/orphan assignment;
- changing the canonical blueprint;
- claiming end-to-end production reorg handling before executable runtime tests pass.

## Next implementation step
Implement an isolated identity-aware ingestion seam behind tests, then verify it against the existing IngestionEngine persistence/recovery behavior. Keep the legacy cursor path unchanged until the seam is proven.