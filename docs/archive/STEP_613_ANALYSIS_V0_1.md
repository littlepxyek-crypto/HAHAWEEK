# STEP 613 — Failure-Isolated Resilience & Operator Architecture — Analysis v0.1

## Authorization
STEP 613 is explicitly authorized by the user's standing execution instruction dated 2026-09-26 and bounded by the merged Contract:
docs/CONTRACT_FAILURE_ISOLATED_RESILIENCE_OPERATOR_ARCHITECTURE_V0_1.md
Contract merge: PR #541, merge commit 4b58ad889991ee803d572b663cbeacd2143a003a.

## Starting State
Main was inspected after STEP 612 closure and Contract #541 merge.
STEP 612 remains VERIFIED / RECONCILED / DOCUMENTED.
The resilience Contract is merged without production implementation.

## Existing Repository Capabilities

### Acquisition / provider
- RPC calls already use timeout-bearing ethers FetchRequest.
- rpcCall retries failed calls with bounded exponential backoff.
- Raw log acquisition uses rpcCall for getLogs.
- Provider failure propagates rather than becoming empty evidence.

### Durable evidence / processing
- createVerifiedProcessingContext snapshots database state before processing.
- On non-durable failure it restores the database snapshot.
- Canonical decision input and runtime canonical lineage are explicitly resolved.
- Reorg replacement preserves lineage/history rather than overwriting prior lineage.
- Empty canonical result is represented separately from a failed acquisition.

### Cursor / authority
- BlockCursor advances only after successful processing.
- Batch cursor advancement occurs after processorRange and authority gate.
- Production authority requires verified processing context, exact range, generation, expected authority, binding validation, and writer fence.
- Durable lifecycle reconciliation verifies contiguous ranges and exact expected authority before cursor advancement.
- Reconciliation preserves cursor when gaps, mismatches, or cursor persistence failures occur.

### Concurrency
- Single writer fence exists with atomic lock acquisition and lease/fence identity.
- Authority paths assert writer ownership before durable mutations.

### Operator surface
Repository-defined commands are exposed through package scripts/bin:
status, health, test, scan, start, repair.
Health currently validates RPC chain identity and block reachability and fails on RPC errors.

### Runner
Runner retries failed cycles with exponential backoff and exposes cycle failure text.
It currently treats different failure classes uniformly and does not persist a structured operational state.

## Findings / Gaps

### A. Operational state is too coarse
State persistence currently stores version, lastProcessedBlock, status, lastError, updatedAt.
Runtime states such as provider unavailable, degraded coverage, recovering, blocked by authority mismatch, and conflicting evidence are not represented as distinct durable operator states.

### B. Failure classification is not durable
Failures propagate as Error messages/codes, but the persistent state does not retain a structured failure class, failure boundary, recoverability, or evidence/cursor impact.

### C. Error-path state persistence can mask the primary failure
src/index.js catches the runtime error and attempts saveState. If persistence itself fails, the persistence error can replace the original runtime failure at the outer boundary. This needs explicit analysis/design treatment before implementation.

### D. Runner retries are not failure-domain aware
src/runner.js retries every cycle failure using the same backoff policy. This does not itself mutate authority, but it does not distinguish transient provider failure from blocked authority, corrupted durable state, writer-fence failure, or integrity ambiguity. A fail-closed operational boundary needs classification before retry/stop decisions.

### E. Health is acquisition-centric
src/health.js reports RPC reachability and chain ID but does not expose durable cursor/evidence/authority/recovery state. Therefore HEALTH: OK does not prove the full HAHAWEEK runtime is healthy.

### F. Recovery evidence is strong but fragmented
Restart recovery, lifecycle reconciliation, writer fence, and canonical lineage have separate tests. There is no single operator-visible recovery state/verification contract tying:
LAST VERIFIED STATE → durable-state verification → recovery → verification → STOP/FAIL-CLOSED.

### G. Observer/derived isolation requires explicit contract-level tests
Existing derived-evidence authority tests protect non-authority, but the resilience boundary should add tests proving a derived/observer failure does not mutate authoritative evidence or cursor state.

### H. Concurrency and integrity are substantially covered
Writer fence and authority reconciliation already provide strong existing controls. New implementation should extend, not replace, these controls.

## Required Design Questions

1. Which durable operational states are necessary versus redundant?
2. How should failure class, boundary, recoverability, and cursor/evidence impact be represented without creating a second authority?
3. How should runner retry versus STOP decisions be derived deterministically?
4. How can health/status expose durable integrity and recovery state without becoming authority?
5. How should recovery verification bind to existing authority reconciliation?
6. How can observer/derived failure be isolated and tested without changing Surveillance authority?
7. How should malformed/corrupt operational state fail closed?
8. What minimum operator workflow can prove setup/start/status/health/failure/recovery/verification/STOP without claiming unobserved interactive execution?

## Proposed Design Boundary
The minimum implementation should extend the existing operational state/reporting and failure-classification boundary while reusing existing cursor, writer-fence, canonical-lineage, authority-gate, and reconciliation mechanisms.

It must not introduce:
- a second evidence authority;
- cursor mutation outside existing barriers;
- new canonical provider authority;
- historical rewrite;
- silent fallback;
- automated trading/execution;
- actor inference/deanonymization;
- changes to frozen STEP 612 semantics.

## Analysis Conclusion
The repository has substantial existing evidence, integrity, cursor, reorg, writer-fence, and recovery primitives. The main resilience gap is not absence of all safeguards; it is the lack of a unified, durable, fail-closed operational state/failure classification and operator recovery boundary that composes those existing safeguards without taking authority from them.

Design is authorized by this verified Analysis.
