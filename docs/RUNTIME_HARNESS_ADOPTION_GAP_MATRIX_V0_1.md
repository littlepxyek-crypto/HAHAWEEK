# Runtime Harness Adoption — Baseline Gap Matrix v0.1

**Contract:** `HAHAWEEK-RUNTIME-HARNESS-ADOPTION-V0_1`  
**Inspection baseline:** `b4722a1f45367282dc152a31ae6e7e6f54a322ef` (main)  
**Inspection mode:** GitHub source/test inspection; no local test execution performed  
**Status:** INITIAL / PARTIAL — this is not a production-readiness assertion

## Evidence labels

- **SOURCE-OBSERVED:** source file inspected.
- **TEST-PRESENT:** named test exists and its source was inspected.
- **RUNTIME-VERIFIED:** exact-commit runtime artifact has been inspected for the claim.
- **GAP / NOT PROVEN:** current inspection does not establish the claim.

## Matrix

| Capability | Existing implementation/evidence observed | Remaining work / acceptance gate |
|---|---|---|
| Persistent runtime and bounded retry | `src/runner.js`; `src/core/operational-state.js`; `tests/runner-operational-state.test.js`; runner classifies retryable provider failures separately from blocked authority failures. | Inspect full shutdown/error paths and exact-head CI. Prove server/process supervision and deployment behavior separately; source code alone does not prove a durable production host. |
| State persistence and monotonic cursor | `src/core/state.js`; `src/core/block-cursor.js`; `tests/block-cursor.test.js`. State writes use a temporary file followed by rename; cursor rejects regression. | Test crash/power-loss durability and state-file corruption/restore boundaries on supported storage. Rename alone is not proof of fsync durability or multi-file transaction atomicity. |
| Evidence-before-cursor recovery | `tests/h04-durability-recovery.test.js` includes simulated crash after evidence commit and idempotent restart; `tests/step-607-integrated-lifecycle-cursor-crash-recovery.test.js` covers lifecycle-durable/cursor-behind reconciliation. | Verify current versions of all related source and tests; run exact-head tests. Test remaining boundaries, persistent-volume restart, backup/restore, and writer contention in the target runtime. |
| Writer fence / lease | `src/core/single-writer-fence.js`; `tests/h03-single-writer-fence.test.js`; `tests/single-writer-fence.test.js`. | Verify multi-process contention and lease-loss behavior against deployment assumptions; source/test existence is not a live contention drill. |
| Evidence integrity / provenance | README describes raw → canonical → V4 integrity authority; source inventory includes `src/core/v4-evidence-commitment.js`, `src/core/authoritative-evidence.js`, and related modules. | Build claim-to-code-to-test-to-artifact mapping for the exact current head. Integrity proves record identity/linkage, not external truth. |
| Replay | `src/core/authoritative-replay.js`; `tests/authoritative-replay-integration.test.js` tests purity, identical formation IDs, and rejection of non-authoritative input. | Inspect replay implementation and broader fixtures; run deterministic replay against preserved, exact-commit runtime artifacts and preserve mismatches. |
| Failure injection | Existing test inventory includes ingestion recovery, RPC retry, reorg lifecycle, durability recovery, authority restart recovery, and operational-state tests. | Inventory coverage by injected failure point. Add tests only for evidenced uncovered cases; don't duplicate an existing verified contract. |
| Resource budgets / sandbox | `src/core/ingestion.js` accepts runtime and RPC-call budgets; package scripts include bounded runtime verification. A8 acquisition design establishes deny-by-default target policy. | Verify enforcement paths and response-size/concurrency bounds. No arbitrary code-execution sandbox is claimed to exist; add one only if agent/tool execution is approved and required. |
| AI agent harness | No AI-agent SDK dependency was observed in `package.json`; current package dependencies include `ethers` and `sql.js`. | Deferred. Design a vendor-neutral, read-only adapter only after H0–H5 gates pass. Do not couple AI to ingestion or V4 authority. |
| Memory / skills | No production memory/skill evolution implementation was established by this bounded inspection. | Deferred until AI harness has provenance, evaluation fixtures, rollback, and regression gates. |
| Production readiness | `PROJECT_STATE.md` explicitly says the HFI-MVP E5 runtime slice does not prove integrated lifecycle/cursor crash atomicity, production-host deployment, persistent-volume restart, backup/restore, writer-fence contention, RPC degradation, or live recovery/replay drills. | Keep V4 authority `INACTIVE`, Architecture Gate `BLOCKED`, and production readiness `NOT READY` until a separate exact-head gate closes every required item. |

## Initial engineering decision

Do not add an AI framework or replace existing runtime components. The repository already contains substantial recovery, writer-fence, authority, replay, and runtime tests. The next implementation must target the smallest gap proven by the current exact-head source/test matrix.

## Required next verification

1. Re-fetch current `main` HEAD and reconcile it against this baseline; this matrix is stale if `main` advances.
2. Inspect the complete implementations for state, cursor, ingestion, writer fence, lifecycle reconciliation, checkpoint/manifest, and V4 commitment.
3. Run exact-head Tests and Security/Regression via GitHub Actions for the chosen implementation commit.
4. Run the relevant bounded runtime/recovery workflow only when its contract and network/resource boundary authorize it.
5. Append a new reconciliation snapshot rather than rewriting prior historical snapshots.
