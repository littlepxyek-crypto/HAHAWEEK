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
