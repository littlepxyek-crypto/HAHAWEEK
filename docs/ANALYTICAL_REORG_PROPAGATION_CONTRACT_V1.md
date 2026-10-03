# ANALYTICAL REORG PROPAGATION CONTRACT V1

Status: IMPLEMENTED / VERIFICATION PENDING CI

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

The implementation is a pure planning boundary.

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

The contract does not activate production authority and does not itself perform a rebuild.

## Current limitation

This contract verifies the propagation decision boundary. It does not yet connect the planner to a persistent projection store or execute automatic rebuilds.
