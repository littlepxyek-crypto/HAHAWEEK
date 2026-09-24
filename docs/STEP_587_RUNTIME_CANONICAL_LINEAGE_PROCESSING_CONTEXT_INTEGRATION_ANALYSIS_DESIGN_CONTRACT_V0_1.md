# STEP 587 — Runtime Canonical Lineage / Processing Context Integration Analysis & Design Contract v0.1

Status: CONTRACT
Step: 587
Predecessor: STEP 586
Baseline: c42520613c74c85c4eb7dc6e6bdfaeef4b03ba9f
V4 production activation: INACTIVE

## Purpose

Authorize the repository-grounded analysis and design required immediately before production implementation of the frozen STEP 584 runtime integration.

## Required analysis

Inspect the current main repository and establish, with exact file/function references:
- runtime call graph;
- canonical decision snapshot construction and ownership;
- raw ingestion boundary;
- STEP 579 transition/generation/parent resolution;
- STEP 568 durable persistence/reconstruction;
- authority context binding;
- cursor barrier;
- outer snapshot/restore;
- writer-fence boundaries;
- replay/restart/reorg/concurrency behavior;
- operator-visible runtime output;
- existing tests, fixtures, and golden vectors.

Resolve whether the STEP 584 integration can be implemented without semantic changes to frozen owners. Any unresolved semantic change must become a separate contract; do not invent behavior.

## Required design

Produce a concrete, implementation-ready mapping:
Requirement → Owner → Exact code location → Change → Test → Security/Regression → CI.

The design must explicitly cover:
- exact processing context shape;
- failure-closed ordering;
- durability boundary;
- authority binding;
- cursor advancement barrier;
- deterministic replay/restart;
- STEP 579 reorg replacement;
- single-writer concurrency;
- operator observability as derived output only.

## Prohibitions

No production code, schema/migration, cursor API redesign, historical rewrite, evidence deletion, silent normalization, fallback generation, second writer fence, unrelated dependency, or V4 activation.

Do not weaken tests to obtain green CI.

## Acceptance

This STEP is complete only after:
- contract merged;
- analysis committed;
- design committed;
- every STEP 584 acceptance criterion mapped;
- tests/security/CodeQL pass;
- review and merge complete;
- exact merge commit post-merge verification complete;
- reconciliation/documentation committed;
- next implementation contract recorded.

V4 production activation remains INACTIVE.
