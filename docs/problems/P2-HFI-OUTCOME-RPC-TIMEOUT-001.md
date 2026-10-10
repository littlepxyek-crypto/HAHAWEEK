# Problem Record — P2-HFI-OUTCOME-RPC-TIMEOUT-001

ID: P2-HFI-OUTCOME-RPC-TIMEOUT-001  
Severity: P2 — MEDIUM  
Discovered At: 2026-10-10  
Location: HFI-MVP runtime verifier / `outcome_logs` / Robinhood Mainnet RPC boundary  
Status: BLOCKED — INVESTIGATION REQUIRED

## Symptom

The HFI-MVP E5 runtime attempt recorded a timeout while acquiring historical swap logs for the seven-day `LIQUIDITY_SURVIVAL` outcome. The runtime artifact reports `state=FAILED`, candidate status `ERROR`, and failure code `NO_VERIFIED_HFI_FORMATION` because no candidate produced a complete seven-day evaluation. This is an acquisition failure; it is not evidence that the pool failed formation or that liquidity survival was negative.

## Evidence

- Repository: `littlepxyek-crypto/HAHAWEEK`
- PR head / runtime commit: `48365ff888020b503efe513d2e2569707e01151a`
- Workflow: [HFI-MVP Runtime Verification, run #479](https://github.com/littlepxyek-crypto/HAHAWEEK/actions/runs/38036371453)
- Runtime job: `114188496941`
- Attempt 1 artifact ID: `11664028057`
- Artifact name: `hfi-mvp-e2e-runtime-evidence-48365ff888020b503efe513d2e2569707e01151a`
- Artifact ZIP SHA-256 reported by GitHub: `e11aa21b224fe4385b783fd55ab8aa98b963b7c3881af6f120f609cc257ebec0`
- Artifact payload: `verification_class=E5_RUNTIME`, `state=FAILED`, `stage=outcome_logs`, `chain_id=4663`
- Query range: blocks `59281989` through `65245352`; chunk size `2500`; outcome-log concurrency `2`
- Error: ethers `TIMEOUT` during `request.send`
- Attempt 2 was `IN_PROGRESS` at the last recorded status inspection. The artifact above belongs to the earlier attempt and must not be treated as attempt 2's result.

## Immediate Cause

The RPC request for historical outcome logs timed out within the runtime verifier's bounded acquisition path.

## Root Cause

UNKNOWN. Available evidence does not establish whether the cause was provider latency/load, transient network behavior, query-specific cost, or another transport/provider condition. Do not attribute the failure solely to the RPC provider or HAHAWEEK logic without additional runtime evidence.

## Architectural Impact

- Acquisition completeness is not established for this candidate/window.
- The seven-day outcome cannot be treated as complete.
- Formation/validation must remain unverified or inconclusive for this attempt; no negative formation or liquidity-survival conclusion is justified.
- No evidence currently shows cursor advancement, canonical evidence mutation, authority bypass, or data loss from this read-only runtime attempt.
- V4 production authority remains `INACTIVE`; Architecture Gate remains `BLOCKED`; production readiness remains `NOT READY`.

## Current Policy Reconciliation

At the inspected `main` baseline, `src/core/hfi-log-range-policy.js` classifies timeouts/rate limits as retryable RPC errors and explicitly excludes them from range splitting. Only explicit, non-transient range/result-limit rejection triggers adaptive splitting. The policy comments explain that splitting transport/rate-limit failures can multiply requests and amplify an outage.

This behavior is intentionally fail-closed and must not be changed solely to make this runtime pass. The historical problem record `P2-HFI-RUNTIME-STALL-001` describes adaptive splitting for retryable transport/rate-limit/range pressure; that statement does not match the current policy and requires a separate documentation reconciliation. Do not silently reinterpret the current policy as a defect.

## Corrective Action

No runtime-code change is authorized by the present evidence. First obtain terminal attempt-2 evidence and inspect the available job logs/artifact. If the timeout recurs, gather request-level duration, retry count, endpoint response/error details, and effective runtime/request-budget state. Then evaluate the smallest bounded correction against the existing policy and contracts.

## Required Verification Before Closure

1. Confirm the terminal result and commit provenance for the latest runtime attempt.
2. Determine root cause or explicitly retain `UNKNOWN` with a bounded mitigation and accepted residual risk.
3. If code changes, add a deterministic regression test for the reproduced failure class and run the affected suite plus security/regression CI.
4. Re-run exact-head HFI-MVP runtime and inspect its artifact, including completeness, formation, seven-day coverage, validation, provenance, and replay.
5. Reconcile this record, the existing runtime-stall record, implementation, tests, and runtime behavior.

## Residual Risk

Historical outcome-log acquisition may time out before complete seven-day coverage is established. A retryable transport failure must remain an acquisition failure/unknown state, never negative analytical evidence. Root cause and corrective fix are not yet verified.
