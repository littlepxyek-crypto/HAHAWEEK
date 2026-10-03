# HAHAWEEK — CROSS-SPEC RECONCILIATION AUDIT v0.1

Status: Draft
Audit baseline: main @ 3621b2dae61b3287de9243d5a3fb1ff69ef34316
Scope: V4 integrity contracts + Evidence Graph A + Temporal/Validation B + Identity Resolution F + Threat Model D + MVP Scope C.
Purpose: identify authority conflicts, state conflicts, temporal leakage, identity over-claims, and non-executable assumptions before MVP implementation.

## 1. EXECUTIVE RESULT

The architecture is coherent at the conceptual level, but it is NOT yet ready for implementation freeze.

The major risks are boundary collisions rather than missing features:
- analytical graph identity must not invent a second V4 hashing protocol;
- analytical state transitions must not be confused with the frozen V4 evidence transition contract;
- Formation/Hypothesis/Validation state machines need separate transition domains;
- Identity Resolution L4/L5 definitions need one unambiguous verification rule;
- source independence must be defined before narrative corroboration thresholds are used;
- the MVP's single-provider boundary cannot establish provider omission resilience by itself;
- the MVP must not claim full V4 authority until checkpoint/cursor/recovery executable verification exists.

No production runtime change is authorized by this audit.

## 2. AUTHORITY STACK

Normative authority must remain:

1. V4 canonicalization and domain-separated hashing.
2. V4 event identity.
3. V4 evidence transition contract.
4. V4 segment/manifest/checkpoint/cursor contracts.
5. Acquisition-specific contracts.
6. Evidence Graph projection.
7. Formation/Hypothesis/Validation analytical state.
8. Research/report/publication derivatives.

Lower layers must not redefine higher-layer identity or integrity semantics.

## 3. FINDINGS

### R-01 — GRAPH IDENTITY HASH COLLISION WITH V4 DESIGN
Severity: HIGH
Status: OPEN

Evidence Graph A proposes:
node_id = SHA256(node_type || canonical_key || scope).

V4 already defines domain-separated canonical hashing:
hash(D,O) = SHA256(UTF8(D) || 0x00 || JCS(O)).

Risk:
A second raw concatenation scheme creates two identity semantics and increases ambiguity about canonical bytes, domain separation, and collision handling.

Required disposition:
Define a dedicated Graph Identity domain and canonical object, for example:
HAHAWEEK-EVIDENCE-V4-GRAPH-NODE
and
HAHAWEEK-EVIDENCE-V4-GRAPH-EDGE
or an explicitly documented non-V4 analytical identity protocol.

Do not implement the current concatenation formula.

### R-02 — ANALYTICAL TRANSITIONS MUST NOT BE V4 TRANSITIONS
Severity: HIGH
Status: OPEN

B/F/C use broad transition records containing reason, evidence_ref, timestamps, actor, and version_seq.

The frozen V4 transition contract has an exact key set:
evidence_id, from_state, previous_transition_hash, sequence, to_state.

Risk:
Using the same word/schema for Formation, Hypothesis, Validation, and Identity transitions can accidentally make analytical transitions appear to be V4 integrity transitions.

Required disposition:
Create separate analytical transition domains, e.g.:
HAHAWEEK-EVIDENCE-V4-FORMATION-TRANSITION
HAHAWEEK-EVIDENCE-V4-HYPOTHESIS-TRANSITION
HAHAWEEK-EVIDENCE-V4-VALIDATION-TRANSITION
HAHAWEEK-EVIDENCE-V4-IDENTITY-TRANSITION

Their schemas must be independently frozen. They may reference V4 evidence IDs but must not mutate V4 state.

### R-03 — FORMATION DISSOLVED TRANSITION IS TOO BROAD
Severity: MEDIUM
Status: OPEN

B permits ANY → DISSOLVED from evidence such as LP removal, self-destruct, or abandonment.

Risk:
A single observed event can be mistaken for a semantic conclusion about an entire formation.

Required disposition:
Define DISSOLVED only through an explicit formation outcome predicate or validation rule. Evidence such as LP removal becomes input to that predicate, not an automatic transition.

### R-04 — IDENTITY L4/L5 VERIFICATION RULE IS INTERNALLY INCONSISTENT
Severity: HIGH
Status: OPEN

F states:
- L4 = signed-message verification;
- L5 = cryptographic full proof;
but later permits signature + consistent event history for L5.

Risk:
A behavioral consistency condition can accidentally promote an identity claim to the same level as direct cryptographic proof.

Required disposition:
Freeze:
L4 = corroborated association under explicit independent evidence.
L5 = only the defined cryptographic/direct-control proof for the specific relation.
A signed message proves control of a signing key under its exact message context; it does not by itself prove a real-world person or organization identity.

### R-05 — SOURCE INDEPENDENCE IS UNDER-SPECIFIED
Severity: HIGH
Status: OPEN

F uses “2 independent sources” and “3 independent sources” thresholds. D states that reposts/syndication do not count as independent.

Risk:
The threshold cannot be executed without a source-lineage model.

Required disposition:
Define source_lineage_id and independence rules before using source-count thresholds in Radar or Claims. URL count must not be treated as independence.

### R-06 — MVP SINGLE-RPC LIMITATION
Severity: MEDIUM
Status: OPEN

C fixes MVP to one verified RPC source.

D includes provider censorship/selective omission as a threat.

Risk:
A single provider cannot by itself prove that omitted chain data was absent from the chain.

Required disposition:
MVP may test provider completeness contracts and failure classification, but must explicitly mark cross-provider omission detection as OUT OF SCOPE. Do not describe single-provider replay as censorship-resilient.

### R-07 — MVP V4 AUTHORITY BOUNDARY IS PREMATURE
Severity: HIGH
Status: OPEN

C describes a vertical slice through “V4 integrity”, while Gate 2 still requires executable checkpoint/cursor/recovery vectors and offline recovery verification.

PR #16 cursor contract remains OPEN and is not merged.

Risk:
MVP implementation could accidentally depend on an authority layer whose complete recovery contract is not yet executable.

Required disposition:
MVP implementation may use already validated V4 components as fixtures/reference validators, but production authority must remain blocked until Gate 2 exit criteria are satisfied.

### R-08 — FORMATION WINDOW EXPIRY VS INCOMPLETE ACQUISITION
Severity: MEDIUM
Status: OPEN

C closes a formation window when the acquisition horizon expires without first swap.

Risk:
An acquisition gap could be interpreted as “no first swap”.

Required disposition:
Window expiry can only yield a negative observation if the acquisition contract establishes completeness for the relevant interval. Otherwise result must be UNKNOWN/INCONCLUSIVE.

### R-09 — VALIDATION RESULT VOCABULARY NEEDS NORMALIZATION
Severity: LOW
Status: OPEN

B defines validation terminal states:
VALIDATED, PARTIALLY_VALIDATED, INVALIDATED, INCONCLUSIVE, UNKNOWN.
The example uses result = PASS.

Risk:
PASS can become an untyped shortcut around the validation state machine.

Required disposition:
Use a typed outcome result and terminal validation state. If PASS is retained, define it as a field inside the evaluation result, never as a replacement for validation state.

### R-10 — SCORE LANGUAGE MUST REMAIN DESCRIPTIVE
Severity: MEDIUM
Status: OPEN

B proposes evidence_completeness, source_diversity, temporal_density, contradiction_ratio, and lag penalty.

Risk:
These can become a hidden overall score or ranking before historical calibration.

Required disposition:
Treat them as descriptive measurements. No aggregation, ranking, or predictive interpretation until separately validated.

### R-11 — TOKEN/NARRATIVE THRESHOLDS NEED VERSIONED OUTCOME RULES
Severity: MEDIUM
Status: OPEN

F proposes 2-source Radar and 3-source + 14-day persistence Claim thresholds.

Risk:
These are currently design assumptions, not validated rules, and source independence is unresolved.

Required disposition:
Move thresholds into versioned validation configuration. They must not be presented as evidence-derived truth until evaluated historically.

### R-12 — SOCIAL SNAPSHOT PROVENANCE NEEDS A FORMAL ACQUISITION CONTRACT
Severity: MEDIUM
Status: OPEN

A/F recognize social mutability and snapshots, but the MVP excludes social input.

Required disposition:
Keep social out of MVP. Before social integration, define acquisition identity, snapshot bytes/content hash, observation time, source lineage, deletion/unavailability semantics, and replayability.

### R-13 — FORMATION / HYPOTHESIS / VALIDATION TRANSITIONS NEED SEPARATE CHAINS
Severity: HIGH
Status: OPEN

B defines three state machines but a generic transition object.

Risk:
Shared transition semantics can blur authority and predecessor rules.

Required disposition:
Each analytical state machine gets its own exact key set, domain, identity, sequence, predecessor, and legal transition matrix. Cross-state references are evidence/provenance links, not shared mutable state.

### R-14 — CLAIM PROMOTION NEEDS AN EXPLICIT CONTRACT
Severity: MEDIUM
Status: OPEN

B says a supported hypothesis does not automatically become a claim, which is correct.

Gap:
The transition from validated hypothesis to research claim is not yet formally specified.

Required disposition:
Later define a Claim/Research provenance contract requiring hypothesis ID, validation ID(s), evidence references, contradiction references, and editorial decision metadata. No autonomous promotion in MVP.

## 4. NON-CONFLICTING AREAS

The following principles are mutually consistent and should be retained:

- V4 is authority; Graph is projection.
- event_time, observation_time, processing_time remain separate.
- reorg preserves history and triggers re-evaluation.
- contradiction is explicit.
- uncertainty is explicit and not equivalent to a single confidence score.
- address diversity is not actor diversity.
- correlation is not identity.
- future evidence cannot influence past formation detection.
- failed/unknown formations remain in historical datasets.
- acquisition failure is not negative evidence.
- no production migration/cursor reset/cutover in MVP.
- one complete auditable vertical slice is preferable to broad unvalidated coverage.

## 5. REQUIRED PRE-IMPLEMENTATION FREEZES

Before MVP implementation:

1. Freeze Graph Identity contract.
2. Freeze analytical transition contracts separately from V4.
3. Freeze Identity Resolution L4/L5 semantics.
4. Freeze source independence model.
5. Freeze formation-window completeness semantics.
6. Freeze validation result vocabulary.
7. Freeze MVP authority boundary relative to Gate 2.
8. Add executable negative vectors for the above.
9. Keep social integration outside MVP.

## 6. CURRENT DESIGN GATE

Result: NOT READY FOR MVP IMPLEMENTATION.

Reason:
The gaps above are schema/authority boundaries, not cosmetic documentation issues.

Next engineering action:
Resolve R-01 through R-08 first, then R-09 through R-14. After reconciliation, create executable cross-spec vectors before implementing the MVP runtime.

## 7. NON-GOALS

This audit does not:
- change production ingestion;
- change raw evidence;
- reset cursor;
- migrate legacy data;
- activate V4 production;
- implement social ingestion;
- create a predictive score;
- evaluate token investment performance.

## 8. CORE CONCLUSION

The current architecture is directionally coherent.

The remaining work is to make boundaries unambiguous:

V4 proves evidence integrity.
Graph describes relationships.
Temporal model describes when.
Identity Resolution describes what may be related.
Formation describes what appears to be forming.
Validation tests whether a hypothesis survives an outcome.
Threat Model attempts to break those assumptions.
MVP proves one complete chain.

Only after those boundaries are executable should HAHAWEEK expand into Radar or broader intelligence.

---

# 9. RECONCILIATION UPDATE — 2026-10-03

This section is an append-only reconciliation overlay. The original findings above
remain historical audit evidence and are not rewritten.

## R-01 — Graph Identity

Status: IMPLEMENTED / CI VERIFIED / RUNTIME REBUILD VERIFICATION PENDING.

The repository now contains a dedicated Graph Identity implementation and contract:
- `src/core/graph-identity.js`
- `docs/GRAPH_IDENTITY_CONTRACT_V1.md`
- `tests/graph-identity.test.js`

Node and edge identities use dedicated domains and canonical objects. Graph identity
does not replace V4 evidence identity.

The PR-head test suite passed the Graph Identity vectors. Full graph rebuild runtime
equivalence remains an open verification item.

## R-02 / R-13 — Analytical Transition Separation

Status: IMPLEMENTED / CI VERIFIED / SYSTEM-WIDE RUNTIME INTEGRATION PENDING.

The repository now contains:
- `src/core/analytical-transition.js`
- `docs/ANALYTICAL_TRANSITION_CONTRACT_V1.md`
- `tests/analytical-transition.test.js`

Formation, Hypothesis, and Validation have distinct analytical domains and legal
transition matrices. These transitions are explicitly outside V4 authority.

The implementation is CI-verified on the current PR head. Complete integration of
transition history across all analytical runtimes remains open.

## R-04 — L4/L5 Boundary

Status: DOCUMENTED / EXECUTABLE VECTOR SET STILL REQUIRED.

The repository contract explicitly separates L4 corroboration from L5
relation-specific direct cryptographic/direct-control proof. A wallet signature
does not by itself establish a real-world identity relation.

Executable positive/negative vectors and runtime enforcement remain open.

## R-05 — Source Independence

Status: DOCUMENTED / EXECUTABLE ENFORCEMENT STILL REQUIRED.

The source-independence contract defines source lineage and I0-I4 classes and
explicitly prevents URL count, reposts, mirrors, aggregators, or acquisition count
from being treated as independent evidence.

Executable enforcement vectors remain open.

## R-06 — Single-RPC Omission Limitation

Status: ACCEPTED LIMITATION / FORMAL EXECUTION CONTRACT STILL OPEN.

The current design does not claim cross-provider censorship/omission detection from
a single RPC provider. This remains an explicit limitation.

## R-07 — V4 Authority Activation

Status: IMPLEMENTED CONTRACT / LIFECYCLE INTEGRATION PENDING / PRODUCTION INACTIVE.

The repository contains `src/core/authority-activation-state.js`,
`docs/AUTHORITY_ACTIVATION_STATE_MACHINE_V1.md`, and executable negative tests
for the activation sequence IMPLEMENTED → VERIFIED → AUTHORIZED → ACTIVE.

This contract is not yet integrated into the existing production authority lifecycle.
V4 production authority therefore remains INACTIVE.

## R-08 — Acquisition Completeness

Status: IMPLEMENTED CONTRACT / ACQUISITION RUNTIME INTEGRATION PENDING.

The repository contains `src/acquisition/completeness.js`,
`docs/ACQUISITION_COMPLETENESS_CONTRACT_V1.md`, and negative tests ensuring
PARTIAL/FAILED/UNKNOWN/EXPIRED cannot become negative absence evidence.

Integration with the acquisition runtime remains open.

## R-09 — Validation Vocabulary

Status: IMPLEMENTED / CI VERIFIED / STATE-MACHINE INTEGRATION PENDING.

Validation v2 now has an authoritative result vocabulary:
CONFIRMED, REJECTED, UNKNOWN, INCONCLUSIVE.

Criterion statuses remain PASS, FAIL, UNKNOWN, INCONCLUSIVE and do not replace the
authoritative validation result. CI on the current PR head verifies these semantics.

The remaining work is integration with the broader Formation/Hypothesis/Validation
transition lifecycle.

## R-10 — Descriptive Measurement Boundary

Status: DOCUMENTED / FORMAL CONTRACT CLOSURE PENDING.

Current implementation does not introduce an overall predictive score or BUY/SELL
ranking. A formal executable measurement-boundary contract remains open.

## R-11 — Threshold Versioning

Status: DEFERRED / SOCIAL-NARRATIVE SCOPE NOT ACTIVE.

No new social/narrative threshold authority is activated by this PR.

## R-12 — Social Snapshot Provenance

Status: DEFERRED / SOCIAL INPUT NOT ACTIVE.

Social acquisition remains outside the current authoritative MVP path.

## R-14 — Claim Promotion Provenance

Status: PARTIALLY IMPLEMENTED / FORMAL PROMOTION CONTRACT PENDING.

Research artifacts retain evidence references, but the full explicit claim-promotion
contract and autonomous-promotion prohibition remain to be formalized.

## Current closure interpretation

No R-01…R-14 item is declared CLOSED solely by this overlay. The distinction between
implemented code, CI verification, runtime verification, and contract closure is
intentional.

The architecture remains IMPLEMENTATION FREEZE BLOCKED and V4 production authority
remains INACTIVE.


---

# 10. RECONCILIATION UPDATE — 2026-10-03 — HYPOTHESIS RUNTIME INTEGRATION

The HFI MVP runtime previously executed Formation → Validation → Research → X Content,
but Hypothesis was not a mandatory executable boundary in the E5 vertical slice.

Correction applied on the active execution branch:
- E5 runtime now creates a DERIVED Hypothesis only from VALID Formation evidence.
- Validation is explicitly linked to that Hypothesis through
  HYPOTHESIS_VALIDATION provenance.
- Replay recreates the Hypothesis and its Validation linkage and checks deterministic
  identity equivalence.
- No V4 cursor, checkpoint, manifest, canonical evidence, or authority state is mutated.
- The integration test now exercises the same Formation → Hypothesis → Validation
  boundary.

Status: IMPLEMENTED; runtime verification pending on the new exact commit.
Residual: analytical transition history is still not a durable system-wide runtime
chain; this remains separate from the Hypothesis linkage closure.


---

# 11. RECONCILIATION UPDATE — 2026-10-03 — CI STALL CONTAINMENT

Problem record: P2-CI-TEST-STALL-001.

The exact PR head `940f6917445c4a767bcb0bd90938c6381bad4a20` entered the
`HAHAWEEK Tests` workflow at 2026-10-03T11:10:47Z and remained in
`npm test` for an extended period without a terminal result. The GitHub
Actions job exposed no live log blob, so the underlying hanging test remains
UNKNOWN and is not attributed to a specific implementation without evidence.

Containment applied without weakening assertions or bypassing verification:
- `npm test` now uses Node's `--test-timeout=60000` per-test execution bound.
- The GitHub test job now has a 20-minute job timeout.
- Existing test concurrency remains serial (`--test-concurrency=1`).
- V4 verification and coverage steps remain mandatory after `npm test`.
- No test was deleted, skipped, weakened, or reclassified.
- No authority, cursor, checkpoint, manifest, canonical evidence, or frozen
  architecture semantics were changed.

Rationale: Node.js 20 documents `--test-timeout` as a fail-closed execution
bound; its default is infinite. This converts an indefinite test stall into a
diagnosable CI failure while preserving the existing test suite.

Status: CONTAINED; ROOT CAUSE UNKNOWN; NEW EXACT-HEAD VERIFICATION REQUIRED.
Residual risk: the current in-flight workflow remains unaffected by the new
configuration; the next exact-head workflow must provide the diagnostic result.


---

# 12. RECONCILIATION UPDATE — 2026-10-03 — HFI RUNTIME PR GATE

The HFI-MVP runtime verification workflow previously executed only on pushes to
`main`. Therefore PR changes to the E5 runtime were covered by unit/integration
tests but did not receive the dedicated `npm run hfi:runtime` vertical runtime
gate before merge.

Correction:
- `.github/workflows/hfi-runtime.yml` now runs for pull requests targeting
  `main` as well as pushes to `main`.
- Existing read-only RPC transport, runtime artifact provenance check, artifact
  retention, and non-zero runtime failure behavior are unchanged.
- The runtime job remains bounded by its existing 45-minute job timeout.
- No production authority or canonical evidence behavior was changed.

Status: IMPLEMENTED; EXACT-HEAD HFI-MVP RUNTIME VERIFICATION PENDING.


---

# 13. RECONCILIATION UPDATE — 2026-10-03 — E5 VALIDATION TEMPORAL CONTRACT FIX

Problem record: P1-HFI-VALIDATION-TEMPORAL-001.

The first PR-enabled HFI-MVP runtime execution produced a preserved artifact with:
`stage=hypothesis_validation` and `FORMATION_CUTOFF_REQUIRED`.

Root cause:
`scripts/hfi-mvp-runtime-verify.js` invoked the already-verified Validation
V2 boundary without supplying its mandatory `formation_cutoff` and
`evidence_temporal_context`.

Impact:
The E5 vertical runtime could not reach Validation, so Hypothesis, Research,
Report, X Content, publication-readiness, and replay were not runtime-verified.
No canonical evidence or V4 authority state was mutated.

Correction:
- Runtime now sets `formation_cutoff=formation.formation_end`.
- Formation evidence is explicitly assigned the `FORMATION` temporal role.
- Outcome observations are assigned the `OUTCOME` role.
- Evidence that legitimately serves both roles is represented with both roles.
- Validation V2 remains the authority for rejecting future formation evidence.
- No contract weakening or temporal-boundary bypass was introduced.

Status: FIX IMPLEMENTED; REGRESSION/EXACT-HEAD RUNTIME VERIFICATION PENDING.
