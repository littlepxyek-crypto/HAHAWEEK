# Problem Record — P2-HFI-OUTCOME-RPC-TIMEOUT-001

ID: P2-HFI-OUTCOME-RPC-TIMEOUT-001  
Severity: P2 — MEDIUM  
Discovered At: 2026-10-10  
Location: HFI-MVP runtime verifier / `outcome_logs` / Robinhood Mainnet RPC boundary  
Status: OPEN — RETRY VERIFIED; ROOT CAUSE UNKNOWN

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
- At initial record creation, attempt 2 was still `IN_PROGRESS`; a later inspection confirmed its terminal result and the separately preserved attempt-2 artifact below.

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

No runtime-code change is authorized by the present evidence. Attempt-2 terminal evidence and artifact have now been inspected (see addendum below). If the timeout recurs, gather request-level duration, retry count, endpoint response/error details, and effective runtime/request-budget state. Then evaluate the smallest bounded correction against the existing policy and contracts.

## Required Verification Before Closure

1. Confirm the terminal result and commit provenance for the latest runtime attempt.
2. Determine root cause or explicitly retain `UNKNOWN` with a bounded mitigation and accepted residual risk.
3. If code changes, add a deterministic regression test for the reproduced failure class and run the affected suite plus security/regression CI.
4. Re-run exact-head HFI-MVP runtime and inspect its artifact, including completeness, formation, seven-day coverage, validation, provenance, and replay.
5. Reconcile this record, the existing runtime-stall record, implementation, tests, and runtime behavior.

## Residual Risk

Historical outcome-log acquisition may time out on future runs. A retryable transport failure must remain an acquisition failure/unknown state, never negative analytical evidence. Attempt 2 succeeded, but root cause remains UNKNOWN and production reliability is not established.


## Addendum — terminal attempt-2 reconciliation (2026-10-11)

The previously running second attempt has now completed. This addendum preserves the first-attempt failure above and does not rewrite it.

- Workflow run #479, attempt 2: [HFI-MVP Runtime Verification](https://github.com/littlepxyek-crypto/HAHAWEEK/actions/runs/38036371453); runtime job `114188496941` concluded `success`.
- Artifact ID `11667716207`; artifact ZIP SHA-256 recomputed after download: `f05fb02a2d242c2af293012fa5b4832deefdd1d3251317c38c002ce8367f23a2`, matching the GitHub artifact digest.
- Payload commit `48365ff888020b503efe513d2e2569707e01151a`, `verification_class=E5_RUNTIME`, `state=VERIFIED`, `stage=replay`, chain ID `4663`; latest block `84913515`.
- Acquisition completeness `COMPLETE`; formation `VALID` with `POOL_CREATED → LIQUIDITY_ADDED → SWAP`.
- Outcome window `2026-09-10T09:04:36.000Z` through `2026-09-17T09:04:36.000Z`; 8,662 outcome observations.
- Validation `CONFIRMED`; `liquidity-survival-hfi-v1=PASS`.
- Integrity counts: 8,664 raw and 8,664 canonical records; manifest `653bef88df94ee30998d491788d99465b64ac0962abc8c8d9eb56082aeb61239`.
- Deterministic replay `equivalent=true`; graph projection contains 25,337 nodes and 34,410 edges.
- Source record says `no_external_publication=true`; this is not evidence of external X publication.
- The artifact's `candidate_results` array is empty although top-level formation/outcome/validation fields are populated. A later code inspection found that `scripts/hfi-mvp-runtime-verify.js` initializes `base.candidate_results` to the candidate diagnostics array, appends entries on per-candidate incomplete/error paths, and returns the successful top-level formation/outcome/validation payload without appending a successful candidate entry. This is consistent with a failure-diagnostics-only interpretation, but no explicit schema/contract or test was located that establishes that meaning. Therefore the field's intended semantics remain `UNKNOWN`; do not treat the empty array as evidence that no candidate was evaluated, and do not change the runtime output until the artifact contract is explicit.

This verifies one successful E5 runtime slice after the earlier timeout. It does not establish the cause of the transient timeout, guarantee future RPC availability, verify production-host durability/recovery drills, or authorize V4 production activation. The record remains OPEN until the historical runtime-stall wording and targeted-pool `candidate_results` semantics are reconciled.


## Addendum — candidate_results contract inspection (2026-10-11)

Inspected the default-branch runtime verifier at blob `642e8092b019842b482aae4f5d1d2a2811ae41c5`. The successful path persists `formation`, `outcome`, `criterion`, `validation`, `report`, `claims`, replay, and integrity fields at the top level; the shared `candidate_results` array is populated by non-success candidate paths and is not given a success entry before the successful return.

- Finding: observed implementation behavior is clear; the public meaning of `candidate_results` is not contractually established by the evidence inspected.
- Classification: P2 contract/documentation ambiguity; no evidence currently proves a runtime correctness defect.
- Action: preserve the artifact and top-level evidence. Do not patch runtime output or weaken any assertions until the field's intended contract and consumer expectations are inspected and reconciled.
- Verification boundary: this is code inspection only, not a test execution. Workflow #481 has no terminal artifact at the time of this addendum.
