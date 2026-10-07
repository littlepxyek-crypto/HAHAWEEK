# Problem Record — P2-HFI-RUNTIME-PERF-002

ID: P2-HFI-RUNTIME-PERF-002
Severity: P2 — MEDIUM
Status: MITIGATED
Discovered At: 2026-10-07
Location: scripts/hfi-mvp-runtime-verify.js / historical RPC acquisition

## Symptom

The historical-block batching experiment increased scheduling concurrency from 12 to 50. The exact-head HFI-MVP run still reached VERIFIED with replay equivalence, but total runtime increased rather than materially decreasing.

## Evidence

Baseline hardening head `daec14d7c4c0fbcb6ccbc3c2d8e52604139cff6d`:
- HFI runtime: 957.694 s
- raw/canonical: 8,664 / 8,664
- outcome observations: 8,662
- replay: equivalent=true

Experiment head `74486bd75235bc53ecebbe1ff30daf0f2365ad36`:
- HFI runtime from artifact: 1,115.420 s
- workflow wall time: approximately 18m58s
- state: VERIFIED
- acquisition: COMPLETE
- formation: VALID
- replay: equivalent=true
- raw/canonical: 8,664 / 8,664
- graph: 25,337 nodes / 34,410 edges
- manifest: 653bef88df94ee30998d491788d99465b64ac0962abc8c8d9eb56082aeb61239
- historical block count: 8,256
- final historical batching detail: batch size 50, 166 scheduling batches

## Root-Cause Assessment

The hypothesis that historical scheduling batches of 12 were the dominant HFI runtime bottleneck is NOT VERIFIED. Increasing the batch size to 50 preserved evidence semantics but did not reduce runtime; it increased the exact artifact runtime by approximately 16.5%.

The remaining dominant cost is therefore unresolved. Current runtime telemetry is insufficient to identify whether time is dominated by:
- RPC transport latency/rate limiting,
- eth_getLogs retries/splits,
- historical getBlock latency,
- provider batching behavior,
- or downstream analytical/replay processing.

This is an observability gap, not evidence corruption.

## Architectural Impact

No evidence-authority corruption was observed. No V4 cursor mutation, canonical evidence deletion, provenance break, replay mismatch, or future leakage was observed.

The performance hypothesis must not be promoted to an architectural fact without stage-level runtime evidence.

## Corrective Action

1. Preserve the verified 50-batch experiment as evidence; do not merge it as a proven performance fix.
2. Add bounded stage-duration telemetry to the HFI-MVP runtime artifact.
3. Add logical RPC telemetry for getLogs/getBlock calls, retries, and adaptive splits.
4. Use the telemetry to identify the dominant stage before selecting the next optimization.
5. Keep production RPC limitation separate: Robinhood documents the public RPC as rate-limited and not recommended for production; historical/indexing workloads should use an archive-capable provider.

## Prevention

Any future runtime optimization must include:
- exact-head runtime artifact;
- before/after runtime measurement;
- evidence/replay equivalence;
- stage-level telemetry;
- no claim of bottleneck closure until the measured dominant stage changes materially.

## Verification

This diagnostic branch adds the telemetry implementation and regression assertions. A new exact-head runtime artifact is required before this problem can move to RESOLVED.

## Residual Risk

The bounded CI HFI path is operationally verified, but performance remains externally dependent and not yet optimized to a production-grade SLA.

