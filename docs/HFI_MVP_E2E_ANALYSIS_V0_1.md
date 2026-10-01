# HFI-MVP-E2E-V0_1 — ANALYSIS / GAP ANALYSIS

## Analysis basis

Analyzed against branch `hfi-mvp-e2e-v0-1`, based on main commit:

`c6b43ae7bc338b3ff9262ef7db978ddd6e42cfdc`

Governing activation Contract:
`docs/CONTRACT_HFI_MVP_E2E_V0_1.md`

## Current-state findings

### Existing reusable components

- Authoritative evidence / canonical evidence / evidence identity boundaries exist.
- Historical Outcome implementation exists in `src/core/historical-outcome.js`.
- POOL_BOOTSTRAP implementation exists in `src/core/pool-bootstrap-formation.js`.
- Evidence Graph implementation exists in `src/core/evidence-graph.js`.
- Frozen Validation Result Contract and executable Validation Integration Boundary exist.
- Research Report implementation and frozen contract exist.
- X Content projection and validation-readiness components exist.
- Replay and runtime authority boundaries exist.
- Existing tests cover substantial deterministic, mutation, provenance, formation, outcome, validation, and replay behavior.

## Gap Analysis Matrix

| Blueprint / Requirement | Contract | Implementation | Tests | Runtime | Status | Gap / Risk |
|---|---|---|---|---|---|---|
| Real Robinhood evidence | Required | Acquisition/runtime components exist | Partial | Not yet proven for HFI | PARTIAL | Need one real end-to-end evidence set |
| Raw evidence preservation | Required | Existing authoritative/raw layers | Existing coverage | Existing runtime boundary | IMPLEMENTED / REUSE | Must prove lineage in HFI slice |
| Canonical evidence | Required | Existing canonical layer | Existing coverage | Not yet HFI-specific | IMPLEMENTED / REUSE | Need E2E linkage |
| Deterministic evidence identity | Required | Existing identity layer | Existing coverage | Not yet HFI-specific | IMPLEMENTED / REUSE | Need E2E proof |
| Integrity / provenance | Required | Existing boundaries | Existing coverage | Existing runtime boundary | IMPLEMENTED / REUSE | Need E2E proof |
| Evidence Graph | Required | Existing graph | Existing deterministic tests | Not yet HFI runtime | PARTIAL | Graph lacks HYPOTHESIS/VALIDATION semantic node types, but expansion must be justified by E2E need; do not rewrite prematurely |
| POOL_BOOTSTRAP | Required | Existing implementation | Strong unit coverage | Real evidence not yet proven | PARTIAL | Semantic vocabulary mismatch: implementation detects event_type SWAP for FIRST_SWAP; integration fixtures use POOL_INITIALIZED/LIQUIDITY_MODIFIED/SWAP |
| Formation temporal order | Required | Block/tx/log ordering exists | Covered | Not yet real runtime | IMPLEMENTED / REUSE | Need event_time semantics verified in real data |
| Historical Outcome | Required | Generic versioned implementation exists | Unit coverage | Not yet real data | PARTIAL | It stores observations but does not define LIQUIDITY_SURVIVAL semantics |
| LIQUIDITY_SURVIVAL | Required | No authoritative methodology/evaluator identified | No dedicated evaluator tests identified | Not proven | MISSING | Critical semantic gap; methodology must be defined before implementation |
| Validation | Required | Frozen result + boundary exist | Existing tests | Not yet E2E | PARTIAL | Generic validation does not itself implement LIQUIDITY_SURVIVAL |
| Research Report | Required | Existing implementation | Existing tests | Not yet E2E | PARTIAL | Need one real lineage-complete report |
| Claim lineage | Required | Report claims require evidence IDs | Existing tests | Not yet E2E | PARTIAL | Need E2E material-claim proof |
| X Content projection | Required | Existing projection/readiness/envelope | Existing tests | External publication excluded | PARTIAL | Need E2E projection only |
| Replay | Required | Existing authoritative replay | Existing tests | HFI replay not yet proven | PARTIAL | Need same-input equivalence across complete vertical slice |
| Failure / recovery | Required | Existing runtime boundaries | Existing coverage | STEP 614 runtime already verified for operator layer | PARTIAL | HFI-derived pipeline must preserve the same boundaries |
| Security / regression | Required | Existing suite | Existing coverage | N/A until changes | PARTIAL | New evaluator/vertical integration needs adversarial tests |
| CI / merge / post-merge | Required | Repository process exists | Historical CI verified | Future HFI changes | NOT_STARTED | Required after implementation |

## Critical semantic finding

The most important missing piece is not the generic Historical Outcome container. It is the authoritative definition and evaluator for:

`LIQUIDITY_SURVIVAL`

The MVP scope contains an example seven-day window and a predefined liquidity fraction, but the example is not sufficient authorization to treat those values as universal methodology.

Therefore:

1. Do not hard-code an assumed threshold.
2. Do not label a generic liquidity observation as survival.
3. Do not produce CONFIRMED/REJECTED until the versioned criterion is explicit.
4. Preserve PARTIAL/UNKNOWN/INCONCLUSIVE when evidence coverage is insufficient.

## Formation semantic finding

There are two existing formation representations:

1. `pool-bootstrap-formation.js` uses semantic labels `POOL_CREATED`, `LIQUIDITY_ADDED`, and `FIRST_SWAP`, while detecting the actual swap using `event_type === 'SWAP'`.
2. Formation-flow fixtures use `POOL_INITIALIZED`, `LIQUIDITY_MODIFIED`, and `SWAP`.

This is a material semantic boundary, not a cosmetic naming issue. The HFI implementation must explicitly map or reconcile these representations under the Contract without silently normalizing them.

## Evidence Graph finding

The existing graph is deterministic and non-authoritative, which is suitable for the current vertical slice. It currently has:

- node types through FORMATION
- edge types including REFERENCES/FOLLOWS

It does not currently model HYPOTHESIS or VALIDATION as graph nodes.

This is not automatically a blocker because Validation and Research Report already have independent provenance contracts. Graph expansion should occur only if the E2E acceptance path demonstrates that the existing graph cannot represent required lineage.

## Operational constraint

The GitHub integration available to this execution can inspect and mutate repository state and inspect GitHub Actions results, but it does not provide a general arbitrary repository-shell execution primitive or workflow-dispatch primitive.

Therefore actual runtime claims will only be made when directly captured/verifiable runtime evidence becomes available through an authorized execution path. CI results alone will not be represented as runtime proof.

## Phase status

CONTRACT: AUTHORIZED
ANALYSIS: IN PROGRESS / SUBSTANTIALLY ESTABLISHED
DESIGN: NOT STARTED
CODE: NOT STARTED
TEST: NOT STARTED FOR HFI CHANGES
RUNTIME: NOT STARTED FOR HFI E2E
MERGE: NOT STARTED
RECONCILIATION: NOT STARTED

## Next logical analysis action

Define the exact LIQUIDITY_SURVIVAL methodology and inspect the existing acquisition/event decoding path to determine whether the required real observations can be produced without changing authoritative evidence semantics.
