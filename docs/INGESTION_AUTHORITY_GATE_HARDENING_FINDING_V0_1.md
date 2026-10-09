# Ingestion Authority Gate Hardening — Finding V0.1

Status: IMPLEMENTATION CANDIDATE / VERIFICATION PENDING

Date: 2026-10-09

## Finding P1-A — Missing explicit authority gate

### Symptom
The `IngestionEngine` API previously allowed processing and cursor advancement when the caller omitted `authorityGate`.

### Root cause
The constructor installed an `UNGUARDED` fallback and the acceptance checks were conditional on whether the caller had provided a gate.

### Corrective action
Require an explicit `authorityGate` function and require its result to have `status === 'AUTHORIZED'` before cursor advancement on batch and legacy processing paths.

### Regression coverage
- Construction without a gate must throw `AUTHORITY_GATE_REQUIRED`.
- A rejected batch/legacy authority decision must leave the cursor unchanged.

## Finding P1-B — Initial cursor bootstrap bypassed the gate

### Symptom
When the cursor was null, the engine initialized it to the safe head and returned without consulting authority.

### Root cause
The first-run bootstrap path was treated as initialization rather than a cursor mutation. It establishes the beginning of the monitored history and therefore has acquisition-coverage implications.

### Corrective action
The engine now submits an explicit `CURSOR_BOOTSTRAP` decision to the authority gate before initializing the cursor. If the gate does not return `AUTHORIZED`, bootstrap fails closed and the cursor remains unchanged.

### Contract and operational limitation
The production `createAuthorityGate` currently requires `checkpointCommitted === true` and an authority/expected-authority binding for a processed range. It does not yet define a dedicated bootstrap authorization contract. Therefore this hardening intentionally prevents a fresh production cursor from silently initializing until that contract is reconciled. It does not invent a checkpoint, backfill boundary, or authority record.

The existing first-run behavior—starting at safe head without processing prior history—remains a separate acquisition-completeness decision. Historical coverage must be explicitly scoped; no missing historical blocks are treated as negative evidence.

### Regression coverage
- A rejected bootstrap authority decision must leave the cursor null.
- Existing first-run tests with an explicit accepting test gate exercise the test-only bootstrap path.
- Production bootstrap compatibility and runtime behavior remain unverified pending a versioned bootstrap contract and exact-head CI/runtime.

## Authority and safety

- This change does not activate V4 production authority.
- It does not reset an existing cursor, rewrite evidence, change canonicality, or modify manifest/checkpoint formats.
- Unit-test gates are test fixtures only; they do not authorize production V4 authority.
- Production authority remains INACTIVE; Architecture Gate remains BLOCKED; production readiness remains NOT READY.

## Verification record

- PR: https://github.com/littlepxyek-crypto/HAHAWEEK/pull/793
- PR head inspected: `6a70d086cbff6834ffb8f82dd352283c755e26c9`.
- HAHAWEEK Tests run `37872356083`: SUCCESS on that PR head.
- HAHAWEEK Security and Regression run `37872356097`: SUCCESS on that PR head.
- Analytical Reorg Runtime run `37872356091`: SUCCESS on that PR head.
- A9 Runtime run `37872356282`: SUCCESS on that PR head.
- HFI-MVP Runtime run `37872356152`: SUCCESS on that PR head.
- HFI-RADAR Continuous Runtime run `37872356084`: FAILED on that PR head with `CHECKPOINT_NOT_COMMITTED`, followed by `HFI_RADAR_CONSECUTIVE_FAILURE_LIMIT`.
- The failure is consistent with the documented missing bootstrap authorization contract: bootstrap submits `checkpointCommitted: false`, while the production gate requires a committed checkpoint.
- These results are exact-head historical evidence for `6a70d086cbff6834ffb8f82dd352283c755e26c9`; they are not verification of a subsequent commit.
- The next implementation decision is BLOCKED on defining a versioned bootstrap/acquisition-coverage contract that does not weaken checkpoint, expected-authority, processing-context, or cursor invariants.
- Do not merge or activate production authority based on the partial successes above.


## Verification update — exact PR head `4961c13bdd360ce3887e93baa26fe780f0a8cc88`

Date: 2026-10-09

### Runtime evidence

The following GitHub Actions results were retrieved for this exact head:

- HAHAWEEK Tests run `37875857337`: SUCCESS.
- HAHAWEEK Security and Regression run `37875857391`: SUCCESS.
- Analytical Reorg Runtime run `37875857352`: SUCCESS.
- A9 Runtime run `37875857373`: SUCCESS.
- HFI-RADAR Continuous Runtime run `37875857366`: FAILED.
- HFI-MVP Runtime run `37875857333`: IN PROGRESS at the time of inspection.
- The commit combined-status endpoint returned no status entries; this is not evidence of a passing combined status.

The HFI-RADAR job's unit/negative-test step passed (8 tests, 0 failures), but the bounded Mainnet continuous runtime failed on both attempts with `CHECKPOINT_NOT_COMMITTED`, then terminated with `HFI_RADAR_CONSECUTIVE_FAILURE_LIMIT`. This separates a passing unit/negative-test step from a failing live runtime; it does not justify suppressing or weakening either result.

### Contract reconciliation

The existing `docs/ACQUISITION_COMPLETENESS_CONTRACT_V1.md` states that completeness is acquisition/analytical metadata and does not mutate V4 authority or advance the V4 cursor. It therefore cannot itself authorize bootstrap cursor initialization.

The existing normative V4 cursor/checkpoint contracts require cursor state to remain subordinate to a verified segment → manifest → checkpoint chain. The current production authority adapter additionally requires `checkpointCommitted === true` and, when supplied, a VERIFIED processing context bound to the exact range and generation. The current `CURSOR_BOOTSTRAP` request supplies `checkpointCommitted: false` and no processing context, so the observed rejection is consistent with the current code/contracts.

### Disposition

- Problem ID: `HW-P1-001`
- Severity: P1 — production-blocking authority/bootstrap contract gap.
- Status: BLOCKED.
- Root cause: no reconciled contract defines how a fresh acquisition establishes a truthful coverage boundary and a valid V4 authority chain before the first cursor position is persisted.
- Corrective action now: preserve fail-closed behavior; record exact-head runtime evidence; do not fabricate a checkpoint, skip the authority gate, or reinterpret acquisition completeness as authority.
- Next safe boundary: define and reconcile a versioned bootstrap/initial-coverage contract against the normative segment, manifest, checkpoint, cursor, acquisition-completeness, and production-activation contracts before implementing a production bootstrap path.
- Regression acceptance: missing/rejected bootstrap authority leaves the cursor unchanged; invalid/missing checkpoint or chain remains rejected; exact-head runtime and restart/replay verification must pass before merge consideration.
- Residual risk: fresh production acquisition remains blocked; HFI-RADAR continuous Mainnet runtime is not verified.
- Production V4 authority remains INACTIVE. Architecture Gate remains BLOCKED. Production readiness remains NOT READY.

This update records evidence and disposition only. It does not change runtime code, authority semantics, cursor state, canonical evidence, or activation state.


## Follow-up implementation candidate — process initial safe-head block through V4

Date: 2026-10-09

### Evidence prompting this change

The exact PR merge-ref runtime for commit `2c99fe5b846e7946e7418c2571987699e4c9fcc2` (synthetic merge commit `da1ac85e6418104cba9ac5461ab611a6837c911c`) again passed the eight HFI-RADAR unit/negative tests and failed the bounded Mainnet runtime with `CHECKPOINT_NOT_COMMITTED` on both cycles. The failure occurs at the explicit `CURSOR_BOOTSTRAP` gate, before processing the first block.

### Minimal implementation candidate

The ingestion engine no longer persists a cursor by calling a bootstrap-only authority decision. When the cursor is null, it treats `safeHead` as the first block in the acquisition window and runs it through the existing processing path. The cursor remains null until the normal processor has returned and the authority gate has returned `AUTHORIZED`; only then does `cursor.advance(safeHead)` persist the position.

This preserves the no-backfill boundary: blocks below `safeHead` are not acquired and their absence is not interpreted as negative evidence. It changes the previous behavior by processing the single initial safe-head block rather than skipping that block.

### Changes made; verification pending

- `src/core/ingestion.js`: removed direct uncommitted `CURSOR_BOOTSTRAP` authority request; the null-cursor path now enters the normal block/range processing loop with an ephemeral starting position of `safeHead - 1`. No negative position is persisted.
- `tests/ingestion.test.js`: first-run test now requires the single safe-head range to be processed and authority accepted before cursor advancement.
- `tests/authority-acceptance-cursor-barrier.test.js`: negative test now requires a rejected first safe-head authority decision to leave the cursor null.

The three files were re-fetched after their respective GitHub contents commits and their contents matched the intended updates. No local tests were run from this connector session. Exact-head CI, Mainnet runtime, restart/recovery, and replay verification remain pending.

### Safety boundary and acceptance criteria

- This is an implementation candidate, not a verified or authorized production change.
- The ordinary production processing-context and authority-chain checks remain in place; no checkpoint is fabricated and no authority gate is bypassed.
- If processing, checkpoint establishment, or authority acceptance fails, the persisted cursor must remain null. Any already durable processing evidence must be safe to replay idempotently.
- The exact resulting head must pass the complete test/security suites and bounded Mainnet runtime, then restart/recovery and replay checks.
- If the new runtime exposes a missing initial-range invariant (for example, processing-context creation or lifecycle reconciliation cannot establish the first range), preserve the failure and resolve the underlying contract/implementation defect; do not weaken the gate.

Current disposition: `HW-P1-001` remains BLOCKED pending exact-head verification. V4 production authority remains INACTIVE; Architecture Gate remains BLOCKED; production readiness remains NOT READY.
