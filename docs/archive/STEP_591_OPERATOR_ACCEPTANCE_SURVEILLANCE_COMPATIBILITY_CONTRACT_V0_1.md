# STEP 591 — Operator Acceptance & Surveillance Compatibility Contract v0.1

Status: CONTRACT
Step: 591
Predecessor: STEP 590 — Runtime Canonical Lineage / Processing Context Integration
Baseline: 0225ed33cd6a7eae78d4026b4826b8062ae64ba9
V4 production activation: INACTIVE

## Purpose

Freeze a repository-grounded acceptance boundary so a human operator can understand and reproducibly operate HAHAWEEK without changing frozen technical semantics, while preserving Surveillance as a derived, evidence-linked, versioned analytical capability.

This contract does not activate V4, create a new authority source, change cursor semantics, change canonical evidence ownership, or introduce automated action/trading.

## Operator Acceptance Boundary

Operator acceptance is satisfied only by procedures and outputs already supported by the repository.

The operator must be able to determine, from repository-defined commands/scripts and verified runtime output:

1. setup validity and required runtime configuration;
2. how HAHAWEEK is started/run;
3. runtime health/status and execution outcome;
4. processed range and cursor outcome;
5. verified processing-result/context identity;
6. lineage transition and generation when exposed by verified context;
7. evidence-set digest and authority outcome when exposed;
8. failure category/reason;
9. whether recovery is permitted by existing contract;
10. when to STOP and remain FAIL-CLOSED.

No command, recovery procedure, health interpretation, or operational guarantee may be invented. If repository evidence is insufficient, the gap remains a documented blocker rather than being filled by assumption.

Operator documentation must not become a new source of truth. It is a projection of frozen contracts and verified implementation.

## Frozen Semantic Owners

- Canonical decision semantics remain owned by their existing frozen contract and implementation.
- Canonical lineage/transition/generation remain owned by STEP 579/588 semantics.
- Durable processing-result verification remains owned by STEP 568.
- Runtime processing-context integration remains owned by STEP 590.
- Existing authority integration remains the sole authority boundary.
- Existing BlockCursor API and ordering remain unchanged.
- Existing single-writer fence remains the sole writer authority.
- No operator-facing layer may override these owners.

## Failure / Recovery Boundary

Operator guidance may identify observed failure categories and contract-authorized recovery paths only when supported by repository evidence.

Operator acceptance must preserve:
- no cursor reset;
- no historical rewrite;
- no evidence deletion;
- no silent normalization;
- no bypass of authority;
- no bypass of writer ownership;
- no manual mutation of canonical evidence to force recovery.

A recovery procedure that cannot be proven from repository evidence is STOP/FAIL-CLOSED.

## Surveillance Compatibility Boundary

Surveillance is a derived analytical projection over verified evidence/context.

It:
- does not mutate raw/canonical evidence;
- is not a source of truth;
- does not advance the cursor;
- does not grant authority;
- does not execute trades or automated actions;
- does not assert ownership or actor identity without evidence;
- treats ADDRESS != ACTOR;
- must prevent temporal leakage;
- may expose scoring/risk only after contract-defined validation, uncertainty, and evidence are available;
- must be versioned and evidence-linked;
- must remain reproducible from its declared inputs.

Surveillance output cannot be used to establish canonicality, lineage, generation, authority, cursor state, or processing identity.

Compatibility/audit evidence alone does not authorize Surveillance implementation.

## Authorized Scope

The implementation phase may add only the smallest repository-compatible operator acceptance/documentation and surveillance compatibility artifacts required by this contract.

No schema migration, new dependency, new writer/lock/authority, cursor API change, canonical evidence mutation, historical rewrite, or V4 activation is authorized.

Any production semantic change requires a new contract.

## Acceptance Criteria

STEP 591 contract acceptance requires:
- operator boundary is explicit and repository-grounded;
- frozen semantic owners are preserved;
- failure/recovery remains fail-closed;
- Surveillance boundary is explicit and evidence-linked;
- no new authority/source of truth is introduced;
- V4 remains INACTIVE;
- traceability is preserved;
- implementation scope is minimal and separately verified.

## Required Verification

Implementation, if authorized by a later implementation contract, must follow:
Contract → Analysis → Design → Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation.

Required CI remains the repository-defined HAHAWEEK Tests, HAHAWEEK Security and Regression, and available CodeQL checks.

## Out of Scope

- V4 production activation or Gate 2 approval;
- trading/signing/automated action;
- new surveillance scoring semantics without contract;
- ownership/actor inference;
- new authority or cursor semantics;
- schema migration;
- external UI/product integration not grounded in repository evidence.

Next STEP: STEP 592 — only after STEP 591 contract lifecycle is fully verified and reconciled.
