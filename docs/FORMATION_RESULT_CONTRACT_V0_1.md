# HAHAWEEK — Formation Result Contract Completion v0.1

Status: VERIFIED / FROZEN
Verification: PR #66 merged; post-merge Security & Regression #926 and Push on main #398 succeeded.
Step: 428
Scope: MVP `POOL_BOOTSTRAP`

## Purpose

Complete the runtime Formation Result so it satisfies the minimum fields defined
by the Formation Result & Historical Validation Boundary.

## Required runtime fields

- `formation_id`
- `formation_type`
- `formation_rule_version`
- `chain_id`
- `formation_start`
- `formation_end`
- `state`
- `evidence_ids[]`
- `graph_reference`
- `provenance_reference`
- `created_at`

## Rules

1. `formation_id` remains deterministic and independent of processing time.
2. `graph_reference` identifies the Formation Graph node without making the graph authoritative.
3. `provenance_reference` identifies the authoritative evidence IDs used by the formation.
4. `created_at` is processing metadata and does not participate in formation identity.
5. Existing event ordering and Pool Bootstrap semantics remain unchanged.
6. Raw evidence, canonical evidence, evidence identity, cursor, and repository authority are untouched.
7. Existing V4 implementation remains preserved.

## Acceptance

A valid Pool Bootstrap Formation Result contains every minimum contract field,
references exactly the evidence selected by the formation engine, and retains a
deterministic formation identity regardless of input ordering.
