# STEP 592 — Operator Operability & Reproducible Runbook Contract v0.1

Status: CONTRACT
Step: 592
Predecessor: STEP 591 — Operator Acceptance & Surveillance Compatibility
Baseline: 62da2d1babe667f3c81b2b9bb2dd5f85af7c922c
V4 production activation: INACTIVE

## Purpose

Freeze the smallest repository-grounded contract for making HAHAWEEK reproducibly operable by its human operator, including the explicit acceptance concern that the operator must personally know how to operate HAHAWEEK.

This contract does not change production semantics, frozen technical owners, cursor ordering, authority, canonical evidence, writer ownership, or V4 activation.

## Operator Operability Boundary

The repository is the sole source of operational truth.

The operator-facing artifact must establish, from commands/scripts/configuration actually present in the repository:

1. prerequisites/setup;
2. valid runtime configuration;
3. start/run/one-shot execution;
4. health/status inspection;
5. how to identify processed range/cursor and verified processing outcome when exposed;
6. how to understand evidence/provenance output;
7. how to recognize failure and its category;
8. which recovery actions are explicitly contract-authorized;
9. how to verify recovery;
10. when to STOP/FAIL-CLOSED.

The artifact must be reproducible by the operator without relying on undocumented assumptions.

No command, environment variable, recovery action, health interpretation, or guarantee may be invented. If the repository does not expose enough evidence for a requested operator concern, the gap must be recorded rather than filled by assumption.

## Acceptance Test: Human Operability

Operator Acceptance is not satisfied merely because documentation exists.

The implementation must provide a repository-grounded, repeatable operator path that can be followed and independently checked. The acceptance evidence must demonstrate that the operator can:

- prepare the environment;
- invoke the supported execution path;
- inspect health/status;
- locate the relevant runtime/evidence output;
- distinguish success from failure;
- follow only contract-authorized recovery;
- verify the resulting state;
- preserve cursor/evidence/history;
- recognize STOP/FAIL-CLOSED conditions.

The acceptance artifact must explicitly identify which repository command/script/file supports each operation.

## Frozen Semantic Owners

- canonical decision semantics remain owned by existing contracts/implementation;
- canonical lineage/transition/generation remain owned by existing frozen semantics;
- durable processing-result verification remains owned by STEP 568;
- runtime processing-context integration remains owned by STEP 590;
- existing authority integration remains the sole authority boundary;
- existing BlockCursor API/order remain unchanged;
- existing single-writer fence remains the sole writer authority.

Operator documentation is a projection, never a new source of truth.

## Failure / Recovery

No operator procedure may:
- reset the cursor;
- rewrite historical evidence;
- delete evidence;
- silently normalize data;
- bypass authority;
- bypass writer ownership;
- mutate canonical evidence manually to force success.

Unsupported or ambiguous recovery is STOP/FAIL-CLOSED.

## Surveillance Compatibility

Any operator-facing Surveillance description remains derived, evidence-linked, versioned, reproducible, and non-authoritative.

It must not:
- mutate raw/canonical evidence;
- advance the cursor;
- grant authority;
- execute automated action/trading;
- infer ownership/actor identity without evidence;
- treat ADDRESS as ACTOR;
- introduce temporal leakage;
- expose scoring/risk without contract-defined validation, uncertainty, and evidence.

Documentation/compatibility does not authorize Surveillance implementation.

## Authorized Scope

The next implementation phase may add only:
- repository-grounded operator documentation/runbook;
- focused operator-acceptance tests/fixtures where required to prove existing behavior;
- minimal derived status/output documentation if already supported by implementation.

No schema migration, new dependency, new writer/lock/authority, cursor API change, canonical evidence mutation, historical rewrite, or V4 activation is authorized.

Any production semantic change requires a new contract.

## Acceptance Criteria

STEP 592 contract acceptance requires:
- human operability is an explicit acceptance concern;
- every documented operator action is traceable to repository evidence;
- no invented procedure exists;
- failure/recovery remains fail-closed;
- frozen semantic owners remain unchanged;
- Surveillance boundary remains preserved;
- V4 remains INACTIVE;
- implementation scope is minimal and separately verified.

## Required Lifecycle

Contract → Analysis → Design → Code → Test → Security/Regression → CI → Review → Merge → Post-Merge Verification → Reconciliation → Documentation.

## Out of Scope

- V4 production activation / Gate 2 approval;
- automated trading/action;
- new Surveillance scoring semantics;
- ownership/actor inference;
- new authority/cursor semantics;
- schema migration;
- undocumented operational procedures.

Next STEP after full lifecycle: STEP 593.
