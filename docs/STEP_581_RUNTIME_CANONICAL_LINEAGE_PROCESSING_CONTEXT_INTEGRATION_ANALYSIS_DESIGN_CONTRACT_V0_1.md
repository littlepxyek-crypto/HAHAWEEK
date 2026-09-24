# STEP 581 — Runtime Canonical Lineage / Processing Context Integration Analysis & Design Contract v0.1

Status: CONTRACT
Step: 581
Predecessor: STEP 580
Gate 2: PASS
V4 production activation: INACTIVE

## 1. Purpose

Freeze the scope and acceptance boundary for the analysis and design required before implementing the STEP 580 runtime processing-context integration.

STEP 581 is analysis/design only. It MUST NOT modify production runtime behavior, cursor state, authority semantics, historical evidence, frozen formulas, schema, or V4 activation.

## 2. Repository starting state

Starting main commit: `f04ea55a630fa8356348c28e110d3c89d9703651`.

Repository inspection confirms:
- STEP 579 owns runtime canonical lineage, transition history, generation, processing identities, canonical evidence membership, and lineage reconstruction.
- STEP 568 owns durable processing-result validation, evidence-set digest, immutable persistence, replay/conflict handling, and save-failure restoration.
- STEP 580 freezes the integration boundary but intentionally does not wire runtime ingestion to the verified canonical processing context.
- `src/core/ingestion.js` currently advances the cursor after `processorRange` resolves and invokes an authority gate with checkpoint metadata.
- `src/index.js` currently implements `processorRange` as raw-log ingestion followed by `database.save()`; it does not yet construct or persist the STEP 579 canonical processing context.
- V4 production activation remains INACTIVE.

## 3. Scope

STEP 581 SHALL produce:
1. a repository-grounded implementation-gap analysis;
2. an explicit ownership and call-graph analysis;
3. a fail-closed ordering analysis;
4. exact-range / generation / transition / parent / evidence binding analysis;
5. replay, restart, persistence-failure, reorg, and concurrency analysis;
6. a concrete implementation design for the next implementation step;
7. test, regression, security, CI, observability, and reconciliation requirements for that implementation.

## 4. Mandatory invariants

The analysis/design MUST preserve:
- STEP 579 as canonicality/generation/lineage owner;
- STEP 568 as durable processing-result verifier/persistence owner;
- STEP 580's exact context fields and binding rules;
- single-writer ownership;
- fail-closed behavior on every integrity boundary;
- cursor unchanged until the exact verified result has passed the downstream authority boundary;
- no promotion of expected authority into canonicality/generation authority;
- deterministic replay;
- immutable historical evidence and transition history;
- no silent normalization, truncation, range shifting, or default generation;
- V4 production activation remains INACTIVE.

## 5. Explicit non-goals

STEP 581 SHALL NOT:
- implement runtime integration;
- alter `src/core/ingestion.js`, `src/index.js`, or other production code;
- modify database schema or migrations;
- change cursor behavior;
- implement submitted/live authority;
- activate V4;
- rewrite historical evidence;
- change frozen contracts or formulas;
- introduce unrelated dependencies or architecture.

## 6. Required design outputs

The design MUST specify, at minimum:
- exact integration call sequence;
- context ownership and immutable handoff;
- where canonical decision snapshots are acquired;
- where `acceptCanonicalLineage()` is invoked;
- how STEP 568 `persistProcessingResult()` is consumed and verified;
- how the verified result is returned to the ingestion boundary;
- how authority is bound to the exact result/range;
- how cursor advancement remains downstream;
- transaction/snapshot boundaries;
- writer-fence assertions;
- replay and conflict handling;
- reorg replacement handling;
- restart reconstruction;
- failure rollback;
- concurrency/re-entrancy handling;
- required test vectors and negative cases.

## 7. Acceptance criteria

STEP 581 is complete only when:
1. the contract is merged;
2. repository-grounded analysis is documented;
3. implementation design is documented;
4. traceability from STEP 580 → analysis → design → future implementation is explicit;
5. no production runtime behavior was changed;
6. required CI/security checks pass;
7. review evidence exists;
8. changes are merged;
9. post-merge verification confirms documentation-only scope;
10. reconciliation and project-state documentation are complete;
11. the next step is explicitly identified as the implementation step following this analysis/design.

No Gate 2 PASS for a future production activation is implied by completion of STEP 581. V4 remains INACTIVE.
