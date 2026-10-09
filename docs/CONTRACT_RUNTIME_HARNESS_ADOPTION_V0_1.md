# HAHAWEEK Runtime Harness Adoption Contract v0.1

**Contract ID:** `HAHAWEEK-RUNTIME-HARNESS-ADOPTION-V0_1`  
**Baseline main commit:** `b4722a1f45367282dc152a31ae6e7e6f54a322ef`  
**Scope:** HAHAWEEK standalone runtime reliability, evidence auditability, replay/recovery, and optional AI-agent integration  
**Initial authority:** implementation branch only; no production activation  
**Status:** CONTRACT DRAFT — requires review against current code and exact-head CI before implementation is promoted

## 1. Objective

Adopt useful runtime-harness capabilities without replacing HAHAWEEK's existing evidence authority or introducing an AI system as a source of truth. Implementation is incremental, evidence-backed, and gated by tests.

## 2. Non-negotiable invariants

1. HAHAWEEK remains standalone; ORACLE X and ASTRA are not components of this repository.
2. No silent normalization or mutation of preserved historical evidence.
3. No cursor reset or cursor advancement without the existing authority/checkpoint contract being satisfied.
4. No predictive score or claim promotion without explicit validation and provenance.
5. AI output is an untrusted hypothesis until independently validated against authoritative evidence.
6. No automatic external publication, trading, signing, or other external side effects.
7. Existing V4 production authority remains INACTIVE unless a separate, explicit production-activation contract and all required gates authorize a change.
8. Historical failed runs, artifacts, manifests, and reconciliation snapshots must remain preserved.
9. A successful unit test, CI run, or bounded runtime slice must not be described as proof of full production readiness.

## 3. Adoption workstreams and order

### H0 — Authority and baseline reconciliation (P0)

- Reconcile current main HEAD, relevant contract, source files, workflows, and runtime artifacts by exact commit SHA.
- Build a claim-to-code-to-test-to-artifact matrix.
- Do not rely on stale snapshots as evidence for a newer commit.
- Output: reviewed gap matrix and exact baseline record.

**Acceptance:** every existing capability is labelled IMPLEMENTED / TESTED / RUNTIME-VERIFIED / NOT-PROVEN, with commit-bound evidence or an explicit gap.

### H1 — Persistent runtime and lifecycle (P0)

- Preserve and test bounded runner lifecycle, graceful shutdown, health checks, and fail-closed behavior.
- Validate retry classification and backoff without retrying non-retryable authority/integrity failures.
- Do not add a new scheduler or worker framework unless the gap matrix proves it is needed.

**Acceptance:** deterministic tests cover shutdown, retryable versus terminal failures, unreadable operational state, and no concurrent duplicate cycle.

### H2 — Crash consistency and recovery (P0)

- Test failures at each boundary between evidence write, integrity/manifest/checkpoint commit, lifecycle reconciliation, and cursor advance.
- Ensure cursor advances only after all required authoritative work is committed.
- Test restart from persisted state and persistent-volume simulation where feasible.
- Preserve failure state and error provenance; never silently reset a cursor.
- Test duplicate delivery/retry behavior and define idempotency boundaries.

**Acceptance:** injected crash/failure tests prove no cursor advances past uncommitted authority, no invalid checkpoint is accepted, and recovery either resumes from a verified point or fails closed.

### H3 — Audit and provenance (P0)

- Record source/input references, component/version identity, timestamps, outcome, and failure classification where applicable.
- Keep authoritative evidence separate from operational logs and derived projections.
- Verify manifest/hash/checkpoint linkage against the exact run and commit.
- Avoid credentials and secrets in logs/artifacts.

**Acceptance:** integrity/provenance tests detect altered, missing, mismatched, or wrong-commit artifacts; all outputs remain traceable to authoritative inputs.

### H4 — Replay and failure injection (P1)

- Re-run preserved inputs under pinned versions/configuration where deterministic replay is supported.
- Compare stable identifiers and canonical output, explicitly recording non-deterministic fields.
- Inject RPC timeouts, malformed responses, reorgs, process termination, storage failures, and lease/fence contention.
- Replay is diagnostic and must not mutate authoritative historical evidence.

**Acceptance:** replay equivalence is explicit; mismatches are preserved and reported rather than normalized away.

### H5 — Resource boundaries and sandboxing (P1)

- Retain/verify RPC-call and runtime budgets, bounded concurrency, and response-size/time limits.
- Any future code-execution tool must run in an isolated, least-privilege environment with no implicit filesystem/network/shell access.
- Acquisition target policy and existing deny-by-default controls remain authoritative; no implicit adapter escalation.

**Acceptance:** boundary tests show limits are enforced and unauthorized capabilities fail closed.

### H6 — AI Agent Harness (P2; deferred until H0-H5 gates pass)

- Add an adapter interface for model reasoning, tool execution, context, and bounded agent loops; do not couple the core ingestion engine to a specific model vendor.
- Treat model responses and tool outputs as untrusted inputs.
- Bound iterations, token/cost budgets, tool permissions, wall time, and context size.
- Record model/version, prompt/template version, tool arguments/results (with secret redaction), decisions, and validation outcome.
- Require schema validation and evidence references for every agent-produced claim.
- Keep agents read-only by default. Any action with external side effects requires a separate explicit authorization gate.

**Acceptance:** tests prove an agent cannot write V4 authority, mutate canonical evidence, move the cursor, publish externally, or promote a claim without the existing authority/validation path.

### H7 — Validated memory and skills (P3; deferred)

- Memory stores validated findings and references, not unqualified model assertions.
- Skills are versioned, reviewed, evaluated against regression fixtures, and reversible.
- New memory/skills never rewrite source evidence or historical results.

**Acceptance:** provenance, versioning, rollback, stale-memory handling, and regression tests pass before any memory/skill can influence operational decisions.

## 4. Implementation and release gates

Each workstream must follow this sequence:

`CONTRACT → BASELINE INSPECTION → GAP MATRIX → DESIGN → MINIMAL CODE CHANGE → TESTS → SECURITY/REGRESSION → EXACT-HEAD CI → RUNTIME EVIDENCE (when required) → RECONCILIATION`

- Work on a feature branch and submit a pull request; do not write directly to `main`.
- Do not merge based solely on documentation or a green workflow from a different commit.
- Preserve failed attempts and artifacts as historical evidence.
- Do not claim a gate is passed until its exact evidence has been inspected.
- This contract does not authorize production activation or imply production readiness.

## 5. Required baseline files

At minimum inspect the current versions of:

- `src/core/state.js`
- `src/core/block-cursor.js`
- `src/core/ingestion.js`
- `src/core/operational-state.js`
- `src/runner.js`
- writer-fence, checkpoint, lifecycle reconciliation, V4 integrity, replay, and related test modules discovered during repository inspection.

File names alone are not proof of implementation; claims must be grounded in current source and tests.

## 6. Initial exit criteria

The first implementation PR may only target the highest-priority proven gap from H0-H3. It must include:

- exact base/head commit identifiers;
- a claim-to-code-to-test matrix;
- tests for the specific failure mode;
- security/regression and exact-head CI evidence;
- explicit limitations and remaining gates;
- no changes to production authority semantics.

The AI-agent harness and memory/skill layers remain deferred until their prerequisite gates pass.

## 7. Current status

This file establishes a proposed contract and scope only. It does not assert that any workstream is implemented or verified. The next engineering action is to reconcile the current source and tests against H0-H3, then implement only the smallest evidenced gap in a separate change set.
