# HAHAWEEK — Design Gate 2 State

## Current gate
DESIGN GATE 2 — Evidence Integrity & Provenance

## Current status
NOT PASSED.

The conceptual HAHAWEEK blueprint is preserved and unchanged. Gate 2 concerns the engineering/provenance layer required to implement it safely.

## Review status

### F-01 — Canonical bytes / identity / golden vectors
Status: CONDITIONAL
V4 defines UTF-8, RFC8785 JCS, SHA-256, domain separation and identity preimages. PASS requires executable reference implementation and golden vectors.

### F-02 — Reorg / transition chain
Status: CONDITIONAL
V4 defines explicit transitions, contiguous authority and orphaning. PASS requires deterministic gap, fork, duplicate, reorg and recovery tests.

### F-03 — Checkpoint / cursor authority
Status: CONDITIONAL
Authority is SEGMENTS → MANIFEST → CHECKPOINT → CURSOR. PASS requires executable recovery tests for missing, stale, malformed and inconsistent state.

### F-04 — Legacy migration
Status: CONDITIONAL
V4 defines deterministic byte accounting, source digest, migration identity, disposition records and migration manifest. PASS requires end-to-end migration verification without synthetic provenance.

### F-05 — RPC acquisition provenance
Status: CONDITIONAL
V4 defines per-page acquisition artifacts, request/response normalization, provider/chain identity and receipt/block cross-checks. PASS requires executable acquisition fixtures and capability tests.

### H-01 — Legacy write freeze
Status: OPEN
Runtime enforcement must make legacy writes impossible after LEGACY_FROZEN.

### H-02 — Duplicate/collision isolation
Status: OPEN
Same identity + same digest may be idempotent; same identity + different digest must fail as conflict. Legacy INSERT OR IGNORE semantics must not define V4 integrity.

### H-03 — Single writer / fencing
Status: CONDITIONAL
Lease protocol is defined. PASS requires concurrency and fencing tests.

### H-04 — Durability / crash recovery
Status: CONDITIONAL
Durability ordering is defined. PASS requires crash/recovery tests proving cursor cannot outrun committed evidence.

### H-05 — V4 repository test matrix
Status: OPEN
Required suites include canonicalization, hashes, event identity, transitions, reorg, acquisition, segment, manifest, checkpoint, cursor, lease, migration, backup, collision, crash recovery and offline verification.

## Gate 2 acceptance condition

Gate 2 may become PASS only when:
1. All blockers F-01..F-05 are closed with executable evidence.
2. H-01..H-05 are closed or explicitly dispositioned with verified controls.
3. Reference implementation and golden vectors agree.
4. Offline verifier independently validates protocol artifacts.
5. Legacy/V4 authority cutover is enforceable.
6. Historical evidence remains preserved.

## Next implementation sequence

1. Canonical reference model
2. Golden vectors
3. Offline verifier
4. Failure/recovery matrix
5. Durability/concurrency tests
6. Migration verification
7. Gate 2 re-review
8. Only after PASS: V4 implementation boundary

## Constraints

- FREE-FIRST
- EVIDENCE-FIRST
- STANDALONE
- NO DATA LOSS
- NO VENDOR LOCK-IN
- Do not modify production evidence/state during design gate.
