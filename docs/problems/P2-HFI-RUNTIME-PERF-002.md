# Problem Record — P2-HFI-RUNTIME-PERF-002

ID: P2-HFI-RUNTIME-PERF-002
Severity: P2 — MEDIUM
Status: MITIGATED
Discovered At: 2026-10-07
Location: scripts/hfi-mvp-runtime-verify.js / historical RPC acquisition

## Symptom

The historical-block batching experiment changed scheduling concurrency from 12 to 50. The exact-head HFI-MVP runtime still reached VERIFIED and replay equivalence, but runtime increased rather than materially decreasing.

## Root Cause Assessment

The hypothesis that groups of 12 historical block reads were the dominant runtime bottleneck is NOT VERIFIED. The experiment preserved evidence semantics but did not improve runtime.

The remaining dominant cost is unresolved. Current telemetry was insufficient to distinguish:
- RPC transport latency/rate limiting;
- eth_getLogs retries/splits;
- historical getBlock latency;
- provider batching behavior;
- downstream analytical/replay processing.

This is an observability gap, not evidence corruption.

## Evidence

Baseline hardening head `daec14d7c4c0fbcb6ccbc3c2d8e52604139cff6d`:
- runtime: 957.694 s
- raw/canonical: 8,664 / 8,664
- outcome observations: 8,662
- replay: equivalent=true

Experiment head `74486bd75235bc53ecebbe1ff30daf0f2365ad36`:
- runtime: 1,115.420 s
- state: VERIFIED
- acquisition: COMPLETE
- formation: VALID
- replay: equivalent=true
- raw/canonical: 8,664 / 8,664
- graph: 25,337 nodes / 34,410 edges
- manifest: 653bef88df94ee30998d491788d99465b64ac0962abc8c8d9eb56082aeb61239
- historical block count: 8,256
- batch size: 50
- scheduling batches: 166

## Impact

No V4 authority corruption, canonical evidence mutation, provenance break, replay mismatch, or future leakage was observed.

The unresolved issue is performance diagnosis and production-grade acquisition efficiency.

## Corrective Action

1. Do not merge the 12→50 optimization as a proven fix.
2. Add bounded stage-duration telemetry to the HFI-MVP artifact.
3. Add logical RPC telemetry for getLogs/getBlock calls, retries, and adaptive splits.
4. Use exact-head runtime artifacts to identify the dominant stage before changing behavior again.
5. Keep production RPC limitations separate from application defects.

## Prevention

Every runtime optimization must provide:
- before/after exact-head measurement;
- stage-level timing;
- RPC metrics;
- evidence/replay equivalence;
- documented acceptance/rejection.

## Verification

Telemetry implementation is on this branch. A new exact-head runtime artifact is required before this problem can move to RESOLVED.

## Residual Risk

The bounded CI HFI path is operationally verified, but performance remains unresolved and production-grade RPC acquisition is not yet active.
