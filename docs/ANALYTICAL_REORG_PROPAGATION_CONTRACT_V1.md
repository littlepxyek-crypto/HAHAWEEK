# ANALYTICAL REORG PROPAGATION CONTRACT V1

Status: IMPLEMENTED / VERIFIED / RECONCILED — planner and durable lifecycle verified by current-head CI at b6d6f1fe298ff11c3081c6df083bec7b91cd61a4

## Purpose

Define the executable boundary for propagating canonical evidence reorganization into derived analytical projections without mutating V4 authority or preserving stale downstream conclusions.

## Normative rule

When canonical evidence becomes affected by a reorg:

CANONICAL EVIDENCE
→ affected GRAPH
→ affected FORMATION
→ affected HYPOTHESIS
→ affected VALIDATION
→ affected RESEARCH
→ affected REPORT

Affected projections MUST be marked for invalidation and deterministic rebuild. A downstream projection is affected either because it directly references invalidated evidence or because it explicitly depends on an already affected projection.

## Authority boundary

The planning function remains pure. A separate durable lifecycle executor now records derived invalidation/rebuild state in an append-only SQLite table. Canonical/V4 authority remains outside this lifecycle.

It MUST NOT:

- mutate canonical evidence;
- mutate V4 identity or transitions;
- mutate cursor, checkpoint, or manifest;
- rewrite historical records;
- promote a derived projection to authority;
- preserve a stale affected projection as valid.

## Dependency semantics

Dependencies MUST be explicit and MUST resolve to projection IDs present in the same planning input. An unknown dependency is rejected fail-closed.

The implementation MUST NOT infer hidden dependencies merely from layer order.

This is important because Formation and Graph are parallel projections from canonical evidence. Graph is therefore not a prerequisite for Formation.

## Determinism

The same immutable evidence-impact set, projection set, and dependency declarations MUST produce byte-equivalent output.

## Uncertainty

Reorg impact is an invalidation/rebuild condition, not evidence that an analytical conclusion is false.

## Acceptance

CONTRACT
→ IMPLEMENTATION
→ POSITIVE TEST
→ NEGATIVE TEST
→ RUNTIME VERIFICATION
→ DOCUMENTATION
→ RECONCILIATION

The contract does not activate production authority and does not mutate canonical evidence.

## Durable lifecycle

The derived lifecycle persists append-only events with states INVALIDATED, REBUILT, and FAILED. A rebuild executor must supply a deterministic projection rebuild function. A successful rebuild is recorded only after the rebuilt projection digest is computed. A failed rebuild remains FAILED and is never silently treated as valid.

The lifecycle does not persist authoritative evidence or replace the existing projection constructors. It records lifecycle authority for derived validity and rebuild verification.

## Current limitation

The lifecycle verifies and records derived rebuild completion, but individual projection implementations remain caller-owned rebuild functions. The lifecycle does not invent hidden dependencies or become V4 authority.


## Migration boundary

The durable lifecycle is persisted in schema v9. Legacy database migration paths that converge at schema v8 MUST subsequently execute the v8→v9 lifecycle migration exactly once. This preserves historical evidence while ensuring fresh and migrated databases expose the same lifecycle schema.

The migration is additive: it does not rewrite canonical evidence or derived historical records.


## Controlled runtime verification correction — 2026-10-06

The controlled runtime harness MUST model Graph and Formation as parallel projections from canonical evidence. The F-02 runtime vector therefore gives both projections direct lineage to the invalidated canonical evidence and declares no Graph→Formation dependency.

Downstream dependencies remain explicit where analytically real: Formation→Hypothesis→Validation→Research→Report. The harness asserts this parallel boundary and records `graph_formation_parallel: true` in the runtime artifact.

This runtime remains controlled derived-runtime verification and explicitly does not claim a live RPC chain-reorg experiment. V4 authority remains INACTIVE.
