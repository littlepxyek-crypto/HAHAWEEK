# STEP 589 — Runtime Canonical Lineage / Processing Context Integration Analysis & Design Contract v0.1

Status: CONTRACT
Step: 589
Predecessor: STEP 588
Baseline: f48e9ef4ce8c3eb6287c38918c5583e42d91dc2c
V4 production activation: INACTIVE

## Purpose

Authorize the repository-grounded analysis/design phase that incorporates the frozen STEP 588 generation-establishment contract into the STEP 584 processing-context integration design.

## Required analysis

Inspect current main and verify:
- exact runtime call graph;
- canonical decision API;
- STEP 579 lineage API;
- STEP 588 generation rules;
- STEP 568 durable result/reconstruction;
- authority binding;
- cursor barrier;
- outer snapshot/restore;
- writer fence;
- replay/restart/reorg/concurrency;
- operator output;
- tests/golden vectors.

The analysis MUST identify the exact parent-selection mechanism for CONTINUATION and REORG_REPLACEMENT using persisted canonical lineage/decision evidence. Ambiguity is a blocker; no cursor/authority inference is permitted.

## Required design

Map every STEP 584 requirement to exact owner/code location/test/security/CI and specify:
- generation resolution;
- processing-context construction;
- authority binding;
- cursor barrier;
- failure restoration;
- replay/restart/reorg;
- operator observability.

The design must not change STEP 568/579 semantics beyond the explicitly frozen STEP 588 generation rule.

## Prohibitions

No production code, schema/migration, cursor API redesign, historical rewrite, evidence deletion, silent normalization, second writer fence, unrelated dependency, or V4 activation.

No test weakening to obtain green CI.

## Acceptance

Complete only after:
- contract merged;
- analysis/design committed;
- STEP 584 + STEP 588 requirements fully mapped;
- tests/security/CodeQL pass;
- review/merge complete;
- exact merge post-merge verification complete;
- reconciliation/documentation records the next production implementation contract.

V4 production activation remains INACTIVE.
