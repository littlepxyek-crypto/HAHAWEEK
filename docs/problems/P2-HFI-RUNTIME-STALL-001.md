# Problem Record — P2-HFI-RUNTIME-STALL-001

ID: P2-HFI-RUNTIME-STALL-001
Severity: P2 — MEDIUM
Status: RESOLVED
Discovered At: 2026-10-07
Location: HFI-MVP runtime acquisition / RPC boundary

## Symptom

The HFI-MVP runtime previously remained in its expensive runtime execution step for an extended period without reaching a terminal verification artifact. Earlier executions could consume the global runtime window before producing a candidate result.

## Immediate Cause

The runtime had bounded retry and wall-clock controls but did not adapt a retryable transport/rate-limit failure into a smaller eth_getLogs range. Large acquisition ranges could therefore repeatedly encounter the same provider pressure.

## Root Cause

The acquisition path lacked a unified bounded strategy for runtime budget, RPC-call budget, retryable transport pressure, and adaptive range reduction. Progress observability was also insufficient in earlier runtime revisions.

This record does not assert that a specific Robinhood RPC outage was the sole cause. External RPC behavior remains an independent dependency boundary.

## Architectural Impact

No evidence-authority corruption was observed. No V4 cursor bypass, canonical evidence deletion, authority mutation, or data-loss event was observed.

The impact was operational: HFI end-to-end verification could not reliably reach Formation -> Validation -> Research -> Report -> replay within the configured runtime envelope.

## Corrective Action

The hardening branch introduced:

- shared per-run MAX_RUNTIME_MS budget;
- shared MAX_RPC_CALLS_PER_RUN budget;
- bounded retry/backoff;
- adaptive eth_getLogs range splitting after retryable transport/rate-limit/range pressure;
- bounded minimum acquisition chunk and split depth;
- HFI runtime global watchdog with preserved failure artifact;
- stage/heartbeat persistence;
- continuous radar derived-state event and byte ceilings;
- fail-closed resource-limit behavior without deleting raw/canonical evidence.

A persistent-worker deployment baseline was also added so runtime restarts can resume from durable state instead of relying on an ephemeral process.

## Verification

Exact hardening head:

34d867ffd4602ebc0909b0f712f5c372890dd572

HFI-MVP runtime artifact:

- state: VERIFIED
- acquisition: COMPLETE
- formation: VALID
- validation: CONFIRMED
- replay: equivalent=true
- raw evidence: 8,664
- canonical evidence: 8,664
- manifest: 653bef88df94ee30998d491788d99465b64ac0962abc8c8d9eb56082aeb61239

Artifact SHA-256:

386a67d03ac0b86f39fabaef1e8ab813360e7727a1206f22dfbe6b7587ac261e

The HFI-RADAR operational runtime also reached VERIFIED with provenance, replay, no-lookahead, and authoritative-evidence-mutation checks passing.

## Regression Tests

- RPC runtime/call budget tests pass in HAHAWEEK CI.
- HFI runtime adaptive-splitting boundary tests pass in HAHAWEEK CI.
- HFI runtime artifact/acquisition boundary tests pass in HAHAWEEK CI.
- HFI-RADAR resource ceiling tests pass in HAHAWEEK CI.
- Deployment artifact assertions pass in the local Node test harness after correcting an invalid temporary test harness package configuration.

## Residual Risk

Automatic multi-provider RPC failover is intentionally NOT implemented. Production must pin a source per processing context and explicitly reconcile any alternate source before authority acceptance.

A live persistent-host restart/recovery, backup/restore, RPC degradation, and writer-fence contention drill remain unverified.

Therefore this problem is resolved for the bounded CI/HFI runtime path, but it does not by itself authorize production V4 activation.


## Root-cause refinement — HFI-MVP VERIFIED runtime — 2026-10-07

The exact hardening-head HFI-MVP artifact (commit daec14d7c4c0fbcb6ccbc3c2d8e52604139cff6d) completed VERIFIED after 957.694 seconds. It processed 8,662 unique outcome observations and produced 8,664 raw/canonical evidence items.

Code-path inspection identifies a deterministic amplification point in the historical timestamp stage: one unique `getBlock()` lookup is required per observed block, and the previous implementation scheduled those lookups in groups of 12 even though the targeted provider is configured with `batchMaxCount=50`. For 8,662 unique blocks this creates roughly 722 scheduling batches instead of at most 174 provider-sized batches. The second timestamp pass is cache-only and is not the source of additional RPC traffic.

This is an application-side efficiency defect, not evidence corruption and not proof of a Robinhood RPC outage. Robinhood explicitly states that its public RPC is rate-limited and not recommended for production, and recommends an archive-capable provider for historical reads/indexing. Therefore the runtime must optimize request batching while production must move to a production-grade archive-capable RPC.

Corrective action on branch `fix/hfi-mvp-historical-block-batching-2026-10-07`: align historical block-read concurrency with the configured provider batch capacity (50) and persist batch progress in the runtime heartbeat. Event ordering and evidence semantics remain unchanged because block responses are still memoized and downstream events are deterministically ordered.

Acceptance requires CI regression tests plus an exact-head HFI-MVP runtime artifact proving VERIFIED, replay equivalence, and materially reduced historical-block-read duration. No production V4 authority activation is implied.
