# STEP 585 — Runtime Canonical Lineage / Processing Context Integration Analysis & Design Contract v0.1

Status: CONTRACT
Step: 585
Predecessor: STEP 584
Baseline: 83add47d39ca86fe1a14c4befa5d6c23cd091c9a
V4 production activation: INACTIVE

## Purpose

Authorize the repository-grounded analysis and design phase immediately before the STEP 584 production implementation.

The analysis/design must validate the exact implementation seams identified by STEP 583 and resolve any remaining ambiguity without changing production semantics.

## Required analysis

Inspect the actual main runtime and document:
- exact current call graph;
- canonical decision snapshot invocation;
- raw ingestion ownership;
- STEP 579 transition/generation resolution;
- STEP 568 durable verification;
- authority context binding;
- cursor barrier;
- outer snapshot/restore;
- restart/replay/reorg/concurrency behavior;
- writer-fence ordering;
- current CLI/operator output;
- exact test/fixture impact.

If the current STEP 579 API cannot safely resolve transition/generation for the integration, analysis MUST identify the smallest owner-preserving change required and stop before implementation until a contract authorizes it.

## Required design

Produce a concrete implementation design mapping every STEP 584 acceptance criterion to:
Requirement → owner → code location → test → security/regression → CI evidence.

The design must preserve:
- immutable historical evidence;
- exact ranges;
- deterministic identities;
- existing authority ownership;
- existing cursor API;
- single writer fence;
- V4 INACTIVE.

Operator output may only be a derived projection of verified context.

## Prohibitions

No production code, schema, migration, cursor redesign, evidence deletion, historical rewrite, silent normalization, second lock, fallback generation, or V4 activation is authorized.

Tests must not be weakened to obtain green CI.

## Acceptance

Complete only after:
- contract merged;
- analysis and design artifacts committed;
- all STEP 584 requirements mapped;
- tests/security/CodeQL pass;
- review/merge complete;
- exact merge commit post-merge CI verified;
- reconciliation/documentation records the next implementation contract.

Next implementation phase follows only after this analysis/design is reconciled.
