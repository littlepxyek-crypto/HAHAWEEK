# STEP 605 — V4 Production Authority Activation Readiness Boundary Contract v0.1

- Phase: CONTRACT
- Predecessor: STEP 604 — Post-Merge Verification Evidence State Reconciliation
- Baseline: `519fb09e432ec3138474399eadeafb70c919ca9e`
- Gate 2: PASS
- V4 production authority: INACTIVE / BLOCKED

## 1. Purpose

Establish the missing successor contract after STEP 604 without activating V4 production authority.

This contract defines the repository-grounded boundary for the next analysis/design sequence: determine whether the now-established production-authority lifecycle can safely participate in the V4 production activation path without inventing semantics or weakening any frozen boundary.

## 2. Scope

In scope:

- inspect the current V4 production authority path after STEP 603;
- inspect the durable production-authority lifecycle and its runtime integration;
- verify the relationship among VERIFIED processing context, production authority lifecycle, expected authority, existing authority gate, writer fence, cursor ordering, recovery/reorg, and durability;
- identify any remaining contract or implementation gap required before V4 production activation;
- define the smallest safe activation-readiness boundary;
- preserve Operator Acceptance as a required acceptance concern;
- preserve Surveillance as derived, evidence-linked, versioned, and non-authoritative.

This contract authorizes **Analysis only as the next phase of STEP 605**.

## 3. Explicit non-scope

This contract does not authorize:

- V4 production activation;
- changing the frozen production-authority record schema;
- changing lifecycle identity or existing binding formulas;
- changing cursor semantics;
- changing raw/canonical evidence;
- changing writer-fence ownership;
- adding a second writer or lock;
- changing RPC/provider authority;
- silent normalization;
- cursor reset;
- historical rewrite/deletion;
- fallback/default authority;
- automated action or trading;
- predictive/ranking authority;
- Surveillance-derived authority;
- actor/ownership inference from address identity;
- new operator commands or undocumented recovery procedures;
- deployment or production cutover.

## 4. Preconditions

STEP 605 may proceed to Analysis only because:

1. STEP 604 is VERIFIED / RECONCILED / DOCUMENTED.
2. Gate 2 is PASS.
3. STEP 603 production-authority lifecycle establishment source is merged and reconciled.
4. The current repository remains the source of truth.
5. Existing historical evidence and frozen boundaries remain preserved.

No precondition permits activation by itself.

## 5. Frozen boundaries

The following remain authoritative and unchanged:

- expected authority remains distinct from production authority;
- production authority establishment remains repository-owned;
- lifecycle persistence remains append-only and durable;
- lifecycle source does not advance the cursor;
- cursor advancement remains behind the existing authority gate;
- writer fencing remains the sole writer boundary;
- reorg replacement remains immutable with predecessor linkage;
- production authority must fail closed on integrity, durability, provenance, authority, recovery, reorg, or concurrency uncertainty;
- raw/canonical evidence is not rewritten or deleted;
- Surveillance has no authority over production state.

## 6. Operator Acceptance

STEP 605 Analysis must determine whether an operator can reproducibly:

- establish/observe the production-authority lifecycle using only repository-defined behavior;
- inspect health/status and evidence relevant to activation readiness;
- recognize failure and fail-closed conditions;
- perform recovery only where an existing contract already defines it;
- verify recovery without changing evidence or cursor;
- know when V4 must remain inactive.

No new command or procedure may be invented during Analysis.

## 7. Surveillance

Surveillance remains outside production authority.

Any analysis of Surveillance compatibility must preserve:

- derived-only semantics;
- evidence linkage;
- versioning;
- no raw/canonical mutation;
- no cursor movement;
- no authority creation;
- no automated action/trading;
- no unsupported ownership/actor claims;
- ADDRESS != ACTOR;
- no temporal leakage;
- no scoring/risk authority without its own validated contract.

Compatibility or audit findings do not authorize implementation.

## 8. Required Analysis outputs

The STEP 605 Analysis must produce repository-grounded findings covering:

1. current production-authority lifecycle completeness;
2. runtime authority-gate ordering;
3. durability and crash/restart behavior;
4. reorg/replacement behavior;
5. writer-fence and concurrency behavior;
6. expected-versus-production authority separation;
7. cursor advancement boundary;
8. evidence/provenance preservation;
9. Operator Acceptance readiness;
10. Surveillance boundary preservation;
11. remaining blockers, if any;
12. explicit recommendation for the smallest next Design boundary.

If any activation prerequisite is not proven, the result must remain FAIL-CLOSED and must not activate V4.

## 9. Acceptance criteria for STEP 605 Contract phase

- This contract is committed on a dedicated STEP 605 branch.
- The contract is reviewed through the normal PR/CI path.
- No production semantic is changed.
- No V4 activation occurs.
- The contract explicitly establishes Analysis as the next phase.
- Historical evidence and existing frozen boundaries remain preserved.
- PROJECT_STATE is not rewritten to claim STEP 605 completion before the full lifecycle is completed.

## 10. Required execution sequence

After Contract merge:

**Analysis → Design → Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation → Documentation → Next STEP.**

Any failure follows:

**root cause → minimal fix → test → verify → continue.**

## 11. Completion boundary

STEP 605 is not complete merely because this Contract merges.

STEP 605 may be marked complete only after its full acceptance criteria and required lifecycle evidence are satisfied.

V4 production authority remains **INACTIVE / BLOCKED** unless and until a later repository-grounded contract explicitly authorizes activation and all required gates pass.
