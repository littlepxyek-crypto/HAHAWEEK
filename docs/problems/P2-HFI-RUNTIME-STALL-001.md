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


## Addendum — current policy reconciliation (2026-10-11)

The historical verification above is bound to hardening commit `34d867ffd4602ebc0909b0f712f5c372890dd572`. It must not be read as proof that the current default-branch policy still splits ranges after transient transport or rate-limit errors.

At the inspected current `main` revision, `src/core/hfi-log-range-policy.js` and `tests/hfi-log-range-policy.test.js` establish this behavior:

- explicit, non-transient range/result-limit rejection may trigger adaptive range splitting;
- timeout and rate-limit errors are retryable, but must not trigger range splitting;
- a transient error remains non-splittable even if its message also mentions a block range;
- unknown errors fail closed without range splitting.

The current runtime verifier imports `shouldSplitLogRange` from that policy module. Repository history now explains the policy evolution:

- Commit `a0aecba1742a2a3ef449fdcef8b8917131473f25` changed splitting to require range-limit wording rather than splitting every exhausted request.
- Commit `1224847cf7616aa67eed80dbec7f7811087a7cbd` later reintroduced splitting after retryable transport failures as well as range-limit errors.
- The subsequent correction in PR #804 identified the defect: incidental request-context wording such as “block range” could cause a timeout or rate-limit response to be misclassified as an explicit range rejection, multiplying requests during an outage.
- Commit `46217924ca82413ba9805e0ea205afa642068a78` gave retryable transport/rate-limit classification precedence and narrowed range matching; commit `71c6c1acba487ea30e8f32b6b438cca8e5b02d15` added negative vectors for timeout/rate-limit errors that also mention a range. PR #804 was merged into `main`; the extracted `src/core/hfi-log-range-policy.js` and `tests/hfi-log-range-policy.test.js` retain the corrected bounded-retry/no-split boundary.

**Disposition:** the historical mitigation remains evidence for its exact code revision; the policy evolution is now traced. The original RPC timeout's root cause remains UNKNOWN. Current policy tests were inspected in the repository, but this execution did not run them locally. This reconciliation does not authorize V4 production activation.



## Separate Problem Record — P2-HFI-WORKFLOW-STALL-001 (2026-10-11)

This is a distinct CI workflow/runner incident; it does not reopen or overwrite the historical bounded-runtime fix status above.

Workflow run [#481](https://github.com/littlepxyek-crypto/HAHAWEEK/actions/runs/38088458203), job `114319796949`, was still reported `in_progress` at the latest API inspection. The run began at `2026-10-10T21:39:28Z`; the runtime step began at `21:39:40Z`. At inspection, the runtime step had not completed despite the workflow's configured 45-minute job timeout and the runtime command's external 25-minute bound. Artifact-provenance and artifact-upload steps remained pending, and no artifact was listed.

- ID: P2-HFI-WORKFLOW-STALL-001.
- Severity: P2 — CI/runtime operational stall.
- Immediate cause: the workflow runtime step has not reached a terminal state in GitHub Actions.
- Root cause: UNKNOWN; available job metadata does not establish whether the process, runner, timeout handling, or status reporting is responsible.
- Impact: no terminal runtime result or artifact exists for this run; this is not evidence of a formation failure or canonical evidence failure.
- Regression test: not applicable until the cause is isolated; no code correction is authorized by current evidence.
- Disposition: BLOCKED pending a terminal workflow result or runner-level investigation. Do not infer success/failure, and do not use this run as runtime verification evidence.
- No cursor, checkpoint, manifest, canonical evidence, or V4 authority change is evidenced by this workflow status.
