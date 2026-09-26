# Contract — Failure-Isolated Resilience & Operator Architecture v0.1

## Status
AUTHORIZED CONTRACT DRAFT — explicit user authorization received 2026-09-26. This document freezes scope for the resilience/operator lifecycle; it introduces no production implementation by itself.

## Objective
Establish a repository-grounded resilience and operator boundary so failures in acquisition, observers, derived layers, and operator surfaces remain isolated from authoritative evidence/integrity state, while failures are explicit, diagnosable, recoverable from the last verified durable state, and fail-closed when authority is uncertain.

## Scope
1. Failure-domain isolation between external acquisition/observers/derived layers and authoritative evidence, checkpoint, and cursor boundaries.
2. Explicit operational states only where supported by existing architecture: HEALTHY, DEGRADED, PARTIAL, RECOVERING, BLOCKED, FAILED, and UNKNOWN where semantics are unambiguous.
3. Preserve distinctions: UNAVAILABLE, EMPTY, INVALID, UNKNOWN, CONFLICTING, INCONCLUSIVE; provider failure is never negative evidence.
4. Recovery boundary tied to durable evidence/checkpoint/cursor state; no destructive recovery.
5. Derived-layer rebuildability from preserved evidence where repository architecture already permits it.
6. Observer/Surveillance isolation and non-authority.
7. Conflict preservation and no latest-wins behavior.
8. Operator-visible health/status/coverage/failure/recovery/STOP information using only repository-supported interfaces.
9. Deterministic provenance/identity for newly introduced resilience state where required by existing integrity conventions.
10. Adversarial and regression coverage for the contractually affected failure boundaries.

## Inputs
- Existing HAHAWEEK runtime, state, cursor, checkpoint, evidence, authority, observer, health, runner, and recovery implementations.
- Existing tests and preserved historical evidence.
- External provider outcomes treated as untrusted inputs.

## Outputs
- Contract-grounded resilience state/behavior.
- Deterministic, evidence-linked failure/recovery observations where required.
- Operator-visible diagnostics and supported recovery procedure.
- Tests proving failure isolation, durability, recovery, and authority preservation.
- Documentation and reconciliation artifacts.

## Authority
- Raw/canonical evidence, integrity chain, checkpoint, and cursor remain authoritative according to existing contracts.
- Resilience/health/Surveillance outputs are derived and non-authoritative.
- No new component may become canonical evidence authority merely for availability.
- No cursor reset or unauthorized cursor advance.
- V4 production authority is not activated or expanded by this Contract.

## Evidence / Integrity
- Preserve raw evidence, canonical evidence, deterministic identity, provenance, history, segments, manifests, checkpoints, and cursor state.
- No historical rewrite, evidence deletion, silent normalization, latest-wins, invented evidence, or fallback authority.
- Ambiguous canonicality, identity, provenance, checkpoint, cursor, or authority state fails closed.
- Failure records must not overwrite valid evidence.

## Durability / Recovery
- Recovery starts from LAST VERIFIED STATE.
- Durable state is verified before recovery.
- Recovery must preserve evidence and cursor semantics.
- Restart/recovery must be reproducible and tested.
- Recovery failure remains visible and does not become false HEALTHY.

## Failure Behavior
- Acquisition/provider failure is isolated and classified as unavailable/failure, not absence.
- Observer failure does not invalidate unrelated authoritative evidence.
- Derived-layer failure does not mutate or invalidate authoritative evidence.
- Conflicting evidence remains conflicting.
- Incomplete evidence remains incomplete.
- Unknown remains unknown.
- No automatic destructive cleanup or reset.

## Validation / Temporal Constraints
- State transitions must be deterministic and reproducible from preserved inputs.
- No temporal leakage: future evidence cannot retroactively establish past validity.
- Existing event/observation/processing ordering and reorg semantics remain authoritative.
- Reorg handling must preserve prior history and versioned evidence where applicable.

## Identity / Reorg / Concurrency
- New resilience records include deterministic identity inputs when they become persisted evidence/observations.
- Reorg does not rewrite prior evidence.
- Single-writer/concurrency boundaries remain enforced; failure handling must not create a second writer.
- Existing cursor/authority reconciliation remains the final guard before cursor advancement.

## Security
Evaluate within scope: RPC corruption/unavailability, missing ranges, provider censorship, duplicate/replay/conflicting evidence, temporal manipulation, identity spoofing, graph/derived-layer poisoning, validation leakage, authority confusion, cursor corruption, checkpoint mismatch, and historical mutation.

## Operator Acceptance
Operator must be able to:
SETUP → START → STATUS → HEALTH → UNDERSTAND OUTPUT → IDENTIFY FAILURE → RECOVER → VERIFY RECOVERY → KNOW WHEN TO STOP.

Only repository-defined commands/interfaces may be documented. Operator output must distinguish healthy, failed, unavailable, unknown, conflicting, recovering, blocked, and STOP/FAIL-CLOSED conditions where applicable.

Interactive execution not evidenced by repository tooling must not be claimed.

## Acceptance Criteria
1. Failure in an external provider/observer/derived component does not corrupt preserved authoritative evidence.
2. Valid durable state remains identifiable after unrelated failure.
3. Cursor/checkpoint cannot be reset or advanced merely to hide failure.
4. Unavailable/empty/invalid/unknown/conflicting/inconclusive remain distinct.
5. Recovery from a verified durable state is deterministic and tested.
6. Reorg/history preservation remains intact for affected paths.
7. Observer/Surveillance remains non-authoritative.
8. Operator-visible state exposes failure cause/boundary and STOP conditions.
9. Concurrency/single-writer protections remain intact.
10. Security/regression tests cover the implemented contract boundary.
11. CI, review, merge, post-merge verification, reconciliation, and documentation are completed before closure.
12. No claim of global VERIFIED LIVE is made until the separate Live-Readiness Gate is fully evidenced, including real operator runtime evidence where required.

## Explicit Non-Goals / Forbidden Behavior
- No raw/canonical evidence rewrite.
- No cursor reset or unauthorized cursor advance.
- No V4 production authority activation/change.
- No trading, signing, execution, or automated action.
- No actor inference/deanonymization.
- No predictive scoring/ranking/risk authority.
- No silent normalization or latest-wins.
- No provider becomes canonical authority merely for availability.
- No AI authority.
- No modification of frozen STEP 612 price-impact/slippage semantics.
- No modification of historical artifacts to manufacture progress.
- No production implementation before Analysis and Design are verified.

## Lifecycle
Contract → Analysis → Design → Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation → Documentation → Next STEP.

## Live-Readiness Boundary
This Contract targets known gaps relevant to the global LIVE-READINESS GATE. It does not by itself establish VERIFIED LIVE. Final live status requires direct evidence for every applicable gate item, including operator runtime execution and recovery verification.
