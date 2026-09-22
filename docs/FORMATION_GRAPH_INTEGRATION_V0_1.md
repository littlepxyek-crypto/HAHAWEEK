# HAHAWEEK — Formation ↔ Evidence Graph Integration v0.1

Status: VERIFIED / FROZEN
Verification: PR #64 merged; post-merge Security & Regression #911 and CodeQL #393 succeeded.
Step: 427
Scope: MVP `POOL_BOOTSTRAP`

## Purpose

Connect the canonical Pool Bootstrap Formation Result to the Evidence Graph
without making the graph authoritative.

Pipeline:

`AUTHORITATIVE EVIDENCE → GRAPH PROJECTION → FORMATION RESULT → FORMATION REFERENCES`

## Rules

1. Formation detection remains independent from graph storage.
2. The Formation Result carries the selected `evidence_ids[]`.
3. Every selected evidence ID must already exist as a projected `EVENT` node.
4. Graph projection adds `FORMATION → REFERENCES → EVENT` edges.
5. Graph projection does not mutate raw or canonical evidence.
6. The graph does not become a source of truth.
7. The graph does not perform validation or prediction.
8. The Formation Engine remains protocol-agnostic.
9. Existing V4 implementation remains preserved.

## Acceptance

A valid `POOL_BOOTSTRAP` result must be reproducibly projectable into the
Evidence Graph, with exactly one reference edge per selected formation evidence
ID.

`FORMATION RESULT ≠ GRAPH SOURCE OF TRUTH`
