# STEP 614 — Contract Amendment Proposal: Writer-Fence Runtime Liveness Boundary

Status: PROPOSAL — NOT AUTHORIZED FOR MERGE

## 1. Trigger

Fresh actual operator runtime evidence on the resulting current main reproduced a writer-fence temporal failure after otherwise valid processing:

- lease: 30,000 ms
- watchdog interval: 3,750 ms
- renewal count before failure: 24
- renewal failure: `WRITER_FENCE_EXPIRED`
- observed renewal scheduling delay: 34,783 ms
- observed renewal execution duration: approximately 4.19 ms
- worker event-loop utilization: approximately 0.00214

The mechanism of expiry is established. The exact external scheduling cause remains UNKNOWN / UNPROVEN.

## 2. Current Contract Boundary

The existing Contract is `docs/CONTRACT_LIVE_READINESS_ACTUAL_OPERATOR_RUNTIME_V0_1.md`.

The current implementation treats writer-fence expiry as a hard authority boundary. An expired or stale writer must not regain authority. No grace period, stale-owner resurrection, cursor reset, evidence deletion, or fallback authority is permitted.

The current repository history also records that lease duration, expiry, writer ownership, cursor, evidence, checkpoint, and authority semantics were not changed by the preceding bounded remediations.

## 3. Purpose of Proposed Amendment

Define an explicit runtime-liveness boundary for environments where scheduling latency can exceed the fixed writer-fence lease, while preserving the security invariant that an expired writer cannot silently continue writing authoritative state.

This proposal does NOT itself authorize implementation.

## 4. Proposed Scope

The amendment would authorize analysis and, only after the amended Contract is accepted, implementation of a bounded runtime-liveness solution covering:

1. runtime scheduling/liveness assumptions;
2. measurable watchdog renewal margin;
3. maximum tolerated scheduling gap;
4. lease/renewal temporal relationship;
5. hard expiry behavior;
6. stale-writer rejection;
7. recovery from the last verified durable state;
8. operator STOP conditions;
9. adversarial scheduling and concurrency regression tests;
10. actual runtime acceptance evidence.

## 5. Non-Goals

The amendment would not authorize:

- cursor reset;
- historical rewrite;
- evidence deletion;
- silent normalization;
- latest-wins conflict resolution;
- stale-writer resurrection;
- fallback authority;
- authority expansion;
- V4 activation outside its existing contract;
- Surveillance authority;
- automated trading;
- signing or execution;
- deanonymization;
- removal of uncertainty or contradiction.

## 6. Authority and Security Invariants

The following must remain invariant unless a separately authorized Contract explicitly changes them:

- writer ownership is exclusive;
- expired ownership is not valid authority;
- stale ownership cannot renew;
- cursor advancement requires verified authority;
- evidence remains preserved;
- checkpoint integrity remains required;
- derived operational failure state cannot become evidence or authority;
- failure must remain visible;
- recovery must begin from the last verified durable state.

## 7. Evidence Requirements

The amendment lifecycle must preserve:

RAW
→ CANONICAL
→ DETERMINISTIC IDENTITY
→ INTEGRITY
→ SEGMENT
→ MANIFEST
→ CHECKPOINT
→ CURSOR

Runtime liveness diagnostics are derived evidence and must not become authority.

## 8. Proposed Acceptance Criteria

Before LIVE can be considered:

- writer-fence ownership survives the documented supported runtime scheduling envelope;
- no stale/expired writer can write authoritative state;
- watchdog failure is surfaced and fail-closed;
- restart continuity is verified;
- recovery continuity is verified;
- cursor never advances without authority;
- evidence remains preserved across failure;
- adversarial concurrency tests pass;
- actual operator START/STATUS/HEALTH/failure/recovery/verification procedures are demonstrated;
- limitations and supported runtime boundary are documented;
- post-merge actual runtime evidence is collected on the resulting main.

## 9. Forbidden Shortcuts

The following are explicitly forbidden as a substitute for solving the liveness boundary:

`FAIL → IGNORE EXPIRY → CONTINUE`

`FAIL → RESET CURSOR → RETRY`

`FAIL → DELETE EVIDENCE → RETRY`

`FAIL → RESURRECT STALE WRITER`

`FAIL → PRETEND HEALTHY`

## 10. Authorization Boundary

This document is a Contract Amendment PROPOSAL only.

It does not authorize:

- changing the lease duration;
- changing expiry semantics;
- adding expiry grace;
- changing writer ownership;
- changing cursor/evidence/checkpoint authority;
- merging implementation.

After explicit authorization of this amendment, the lifecycle must resume at ANALYSIS and follow:

CONTRACT
→ ANALYSIS
→ DESIGN
→ CODE
→ TEST
→ SECURITY/REGRESSION
→ CI
→ REVIEW
→ MERGE
→ POST-MERGE VERIFICATION
→ RECONCILIATION
→ DOCUMENTATION
→ ACTUAL OPERATOR RUNTIME
→ LIVE-READINESS GATE
