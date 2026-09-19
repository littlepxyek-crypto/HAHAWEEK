# Proof-of-Observation Trust Model v0.1

**Status:** DESIGN / PRE-SPEC / FROZEN UPON MERGE  
**Scope:** Trust boundaries and epistemic limits for the Proof-of-Observation (PoO) layer only.  
**Protocol family:** HAHAWEEK — Early Formation Intelligence

## 1. Purpose and Scope

This document defines the trust boundaries, trust assumptions, explicit non-claims, versioning boundaries, and epistemic limits of the Proof-of-Observation layer.

This document is a trust model, not an algorithm specification. It does not define the algorithms for provenance dependency graphs, independence classification, reproducibility, state transitions, or HAHA Index calculation. Those are separate specifications.

This Trust Model governs the Proof-of-Observation layer only. It does not retroactively bind V4 internal operations. Where V4 and this document appear to conflict, V4 governs its own internal mechanics; this document governs only the trust boundary of the PoO layer built on top.

PoO does not make a blockchain, observer, RPC provider, explorer, reference implementation, token holder, or operator into an authority over truth merely by recording or verifying an observation.

## 2. Trust Boundary Table

| Component / actor | Truth | Availability | Ordering / interpretation | Scope |
| --- | --- | --- | --- | --- |
| V4 normative specification | Normative for V4 mechanics | Public artifact assumed available | Normative within V4 scope | V4 internal mechanics |
| V4 golden vectors | Test authority for specified vectors | Public artifact assumed available | Normative only for covered vectors | V4 verification |
| V4 offline verifier | Trusted as an executable implementation of its stated rules | Availability is operational, not epistemic | Not a truth oracle | V4 verification |
| HAHAWEEK reference implementation | **Trusted-as-reference, not trusted-as-oracle** | Default reference availability assumption | Must defer to normative specification | PoO reference implementation |
| HAHAWEEK operator | **Not trusted for truth** | **Availability is a declared operational trust assumption in v0.1** | **Not trusted; deterministic ordering must come from published rules/artifacts** | PoO operation |
| RPC provider | Untrusted | Provider-dependent | Untrusted | Evidence acquisition |
| Block explorer / indexer | Untrusted | Provider-dependent | Untrusted | Evidence acquisition / corroboration |
| Observer | Untrusted by default | Untrusted | Untrusted | Observation submission |
| Provenance Dependency Graph (PDG) | Evidence-bearing artifact, not ground truth | Depends on publication | Classification follows its published specification | Provenance assessment |
| Independence classification | Conditional claim | Depends on underlying provenance | Deterministic only relative to its inputs and specification | Evidence relationship |
| Reproducer | Trusted only for its reported execution artifact | Depends on operator | Must be checked against normative rules | Reproducibility |
| $HAHA holder | **No authority over evidence truth or validation** | No special authority | No special authority | Cultural layer |
| Robinhood Chain attestation / registry | Trusted only as a publication / commitment substrate | Chain-dependent | Does not determine interpretation | Optional PoO anchoring |
| Raw evidence | Observed artifact; not automatically true | Depends on preservation | Historical artifact must not be silently rewritten | Evidence layer |

### 2.1 Silence / availability boundary

The HAHAWEEK operator controls practical availability surfaces such as ingestion scheduling, publication timing, reference implementation uptime, and whether an artifact is made available through the operator's infrastructure.

Therefore:

> **HAHAWEEK does not claim that the absence of a published observation implies the absence of that observation in reality.**

An unavailable, unpublished, suppressed, delayed, or undiscovered observation remains epistemically unresolved by PoO.

PoO cannot prove completeness merely from the absence of an artifact.


## Threat Model

Trust Model v0.1 assumes an adversary with the following capabilities. Capabilities outside this list are not covered by v0.1.

### In-scope adversary capabilities

| ID | Capability | Covered? |
| --- | --- | --- |
| A1 | Malicious or mistaken operator | yes |
| A2 | Dishonest observer | yes |
| A3 | Provenance corruption | yes |
| A4 | Provenance omission (selective) | yes |
| A5 | Equivocation (conflicting claims) | yes |
| A6 | Replay of valid past claims | yes |
| A7 | Compromised reference implementation | yes |
| A8 | Network partition / delay | yes |
| A9 | Denial of availability | yes |

### Out-of-scope

- Compromise of the declared normative trust anchors themselves; such compromise invalidates the corresponding trust assumption and requires external recovery or governance.
- Cryptographic primitive breakage.
- Coercion of a root authority.
- Side-channel attacks on the host environment.

### Trust boundary

The declared trust anchors for v0.1 are the applicable normative specification, preserved version history, and the cryptographic primitives explicitly relied upon by the applicable specification. Claim producers, operators, verifiers, storage, networks, RPC providers, explorers, and other external infrastructure are untrusted by default unless a narrower specification explicitly declares otherwise.

The threat model does not turn an anchor into an oracle: an anchor defines the applicable trust assumption; it does not establish the truth of an observed real-world event.

## Failure Modes

Each failure mode maps to exactly one policy. No implicit promotion is permitted.

| Failure | Policy |
| --- | --- |
| Provenance missing | UNKNOWN |
| Provenance partial | UNKNOWN |
| Evidence conflict (equivocation) | INVALID |
| Replay detected | INVALID |
| Artifact unavailable | UNAVAILABLE |
| Data corrupt / unreadable | INVALID |
| Anchor unreachable | UNAVAILABLE |
| Signature invalid | INVALID |

### Distinctions (normative)

- UNKNOWN is not false.
- UNKNOWN is not INDEPENDENT.
- UNKNOWN is not INVALID.
- UNAVAILABLE is not UNKNOWN.
- INVALID is not UNAVAILABLE.

Policy must not collapse these classes. Any downstream specification that collapses them must explicitly reject that input or define a separately versioned semantic rule; it must not perform an implicit conversion.

A failure condition that cannot be classified by this table is itself an unresolved specification condition and MUST NOT be silently promoted to a positive classification or state.

## UNKNOWN Semantics and Propagation

UNKNOWN is a first-class state, not a null, absent value, or implicit default.

### Rules

- R1. UNKNOWN propagates: if any input required by a derived classification or state precondition is UNKNOWN, the derived result is UNKNOWN unless an explicit versioned rule defines a sound exception.
- R2. UNKNOWN MUST NOT be coerced to true, false, INDEPENDENT, VALIDATED, or any other positive/negative conclusion by default.
- R3. UNKNOWN MAY be resolved only by new qualifying evidence, a newly applicable normative rule, or an explicit versioned re-verification event; never by a default value.
- R4. A transition whose required precondition is UNKNOWN is blocked unless an explicit versioned rule defines otherwise.
- R5. Aggregation: UNKNOWN + X = UNKNOWN unless an explicit versioned aggregation rule defines how UNKNOWN is handled without silently converting it to a known value.
- R6. UNKNOWN MUST remain distinguishable from INVALID and UNAVAILABLE in every downstream artifact.

### Forbidden

- Default-to-false.
- Default-to-INDEPENDENT.
- Silent drop of UNKNOWN inputs.
- Best-effort interpretation of UNKNOWN.
- Treating absence of UNKNOWN evidence as evidence that the unknown condition did not exist.


## 3. Trusted-as-Reference vs Trusted-as-Oracle

The HAHAWEEK reference implementation is **trusted-as-reference**, never trusted-as-oracle.

**Trusted-as-reference means:** it is an implementation intended to represent the published normative specification and is a convenient baseline for testing and interoperability.

**Trusted-as-oracle means:** its output is treated as correct merely because the reference implementation produced it.

PoO adopts the first meaning and explicitly rejects the second.

If two implementations disagree on a normative input:

1. the normative specification is consulted;
2. the disagreement is recorded;
3. neither implementation receives authority merely from being the HAHAWEEK reference;
4. if the specification does not resolve the disagreement, the result is **UNKNOWN** until the ambiguity is resolved by a versioned specification change.

Known ambiguities must be recorded as explicit specification issues/artifacts. The reference implementation must not silently resolve a normative ambiguity.

The reference implementation therefore cannot be used to turn prose into an undisclosed de facto specification.

## 4. Provenance Dependency Graph Trust Model

PoO represents provenance relationships using a Provenance Dependency Graph (PDG).

The PDG is itself an evidence-bearing artifact with its own trust boundary.

HAHAWEEK does **not** claim that a PDG is complete, objectively true, or free from operator error.

A provenance relationship may be supported by:

- declarations;
- externally observable signals;
- deterministic inference under a published rule;
- or combinations of the above.

The provenance basis must remain inspectable.

Conceptually, an independence assessment has the form:

```
independence(A, B) -> {
  classification,
  basis[],
  confidence,
  spec_version
}
```

where:

- `classification` is one of `IDENTICAL`, `PARTIALLY_INDEPENDENT`, `INDEPENDENT`, or `UNKNOWN`;
- `basis[]` records the provenance basis used;
- `confidence` is one of `UNKNOWN`, `LOW`, `MEDIUM`, or `HIGH`;
- `spec_version` identifies the applicable PDG / independence rules.

The precise algorithm is outside this Trust Model.

**INDEPENDENT + LOW** is not equivalent to **INDEPENDENT + HIGH**.

**UNKNOWN dependency is never promoted to INDEPENDENT merely because no conflict was observed.**

The PDG therefore moves the trust problem into an explicit, inspectable artifact; it does not claim to eliminate the problem.

## 5. Independence Classification Boundary

The four classifications have the following trust meaning:

### IDENTICAL

Evidence is derived from the same evidence artifact, acquisition identity, response digest, or equivalent directly shared provenance.

### PARTIALLY_INDEPENDENT

Some provenance dependencies differ, but one or more relevant dependencies remain shared or unresolved.

### INDEPENDENT

The applicable specification determines that the known provenance dependencies do not establish a relevant shared dependency.

This is a **conditional classification**, not a metaphysical claim of independence.

### UNKNOWN

Available provenance is insufficient to classify the relationship.

UNKNOWN must not be converted into INDEPENDENT by default.

No classification is an assertion that the underlying operators, organizations, infrastructure, or people are socially independent unless the applicable specification explicitly defines and supports such a claim.

## 6. Reproducibility Trust Model

Reproducibility means that a party other than the original publisher can obtain the same deterministic result from the same normative inputs and published rules.

The HAHAWEEK reference implementation is one implementation of those rules, not the authority that makes the result true.

A reproducibility claim requires:

- public normative inputs;
- public specification;
- deterministic canonical output rules;
- reproducible execution;
- mechanically comparable output;
- preserved execution / result artifacts sufficient for audit.

### 6.1 Blind execution

Where a gate requires multiple implementations, the normative input is supplied without exposing another implementation's output.

A conceptual blind-run procedure is:

```
normative input
     |
     +--> implementation A --> output hash A
     |
     +--> implementation B --> output hash B
     |
     +--> implementation C --> output hash C
```

Outputs are compared only after execution.

The purpose is to test deterministic interoperability, not to prove independent authorship.

### 6.2 Author-independence is UNKNOWN by default

Three agreeing implementations do **not** by themselves prove that their authors are independent.

The Trust Model therefore makes no claim of author-independence unless separately established.

The stronger claim supported by the gate is:

> Three separately executed implementations produced identical results for the specified normative inputs under the stated procedure.

## 7. Specification Version History

PoO interpretations are version-bound.

A state or classification without its applicable specification version is semantically incomplete.

A later specification version does not silently rewrite a historical state.

For example:

```
V4.1:
  VALIDATED
       |
V4.2:
  new evidence / changed classification
       |
       v
  CONTESTED
```

The historical V4.1 interpretation remains part of history.

A later version may trigger re-verification, but re-verification is itself a new recorded event/transition. It must not mutate the historical artifact in place.

State regression is therefore represented as an explicit transition, not as an overwrite.

## 8. State Transition Policy

The following is a trust-model boundary, not the complete state algorithm:

```
UNOBSERVED
    |
    v
OBSERVED
    |
    v
REPRODUCED
    |
    v
CORROBORATED
    |
    v
FORMATION-CONNECTED
    |
    v
VALIDATED
```

A formation may subsequently become:

```
VALIDATED --> CONTESTED
```

when qualifying counter-evidence or a qualifying specification change is recorded.

### 8.1 Contestation is a right, not a vote

An observer may submit counter-evidence subject to the applicable provenance and validation rules.

The number of contestation submissions does not itself change state.

Therefore:

> **Contestation is a right, not a vote.**

A CONTESTED transition requires qualifying counter-evidence according to the State / Validation specification. Submission volume alone cannot produce a state regression.

This is the contestation analogue of the anti-Sybil principle:

> Evidence confidence must not increase linearly with submission count, and state degradation must not occur linearly with contestation count.

The exact threshold and review procedure are intentionally outside this Trust Model.

### 8.2 Counter-evidence

Counter-evidence is historical evidence and must not delete or overwrite the evidence it challenges.

A counter-evidence submission may remain pending, inconclusive, or qualifying according to the applicable state specification.

### 8.3 Collusion is not a state

Collusion or suspected coordination is a property of provenance / evidence relationships, not a standalone truth state.

It must not be converted into a state change merely because an observer or operator labels it as such.

### 8.4 No silent state mutation

A state transition must have:

- an explicit transition identity;
- applicable specification version;
- supporting evidence references;
- provenance references where applicable;
- and a historical record of the transition.

## 9. Explicit Non-Claims

HAHAWEEK does **not** claim that:

1. Evidence is true merely because HAHAWEEK produced it.
2. The trusted reference implementation is a truth oracle.
3. A provenance graph is complete or objectively true.
4. `INDEPENDENT` means mathematically proven independence.
5. Three agreeing implementations prove independent authorship.
6. Reproducibility proves real-world truth.
7. Corroboration proves absence of coordination.
8. HAHA Index predicts price, return, or market direction.
9. $HAHA holders have authority over evidence or validation.
10. An on-chain attestation proves the truth of the underlying evidence.
11. A later specification version rewrites historical states.
12. `VALIDATED` means permanently or universally true.
13. `UNKNOWN` means false.
14. Absence of evidence means evidence of absence.
15. Absence of a published observation means the underlying observation did not occur.
16. The operator's publication surface is complete.
17. A PDG classification proves real-world infrastructure independence.
18. A state label without its specification version is meaningful in isolation.

### 9.1 Normative vs technical status of non-claims

The Explicit Non-Claims section is a **normative declaration, not a complete technical enforcement mechanism**.

The document does not technically prevent an operator, community member, third party, or social-media account from misrepresenting a HAHAWEEK state as a financial signal.

Such misrepresentation is detectable socially and may be addressed by governance, documentation, publication policy, or other mechanisms, but it is not claimed to be mechanically prevented by this Trust Model.

In particular, HAHAWEEK does not claim that a statement such as `HAHA 5 = bullish` is mechanically impossible merely because this document rejects that interpretation.

## 10. Relationship to External Standards

HAHAWEEK may adopt terminology from external standards where useful, but terminology adoption does not import an external trust framework.

In particular:

> **HAHAWEEK adopts the terminology distinction between verification and validation used by W3C Verifiable Credentials, but HAHAWEEK validation criteria are HAHAWEEK-defined and are not derived from W3C Verifiable Credentials.**

RFC 8785 is used as the normative basis for the applicable V4 JSON Canonicalization Scheme boundary. This Trust Model does not redefine RFC 8785.

External standards therefore do not silently become PoO validation authorities.

## 11. Freeze Boundary

This document is frozen as **v0.1** upon merge.

The document does not authorize its own modification.

Changes require a new version and must preserve the historical v0.1 artifact.

Version policy:

- **v0.1.x** — clarifications that do not change trust boundaries, scope, non-claims, or semantic commitments.
- **v0.2** — changes to scope, trust assumptions, state-regression policy, non-claims, or other semantic commitments.
- **v1.0** — a separately approved stable trust model after the PoO specification family has demonstrated the required gates.

Every proposed change must provide:

1. a public diff against the previous version;
2. an explicit change rationale;
3. an explicit list of affected trust assumptions and non-claims;
4. a red-team review window before merge;
5. preservation of the previous version as immutable project history.

A clarification must not be used to smuggle a semantic change into a patch version.

The Git history is part of the document's historical record. A force-push or silent replacement does not constitute a valid semantic freeze transition.

## 12. Freeze Exit Conditions

This Trust Model is considered ready for PoO specification work only when:

- the trust boundaries are documented;
- operator availability and silence limitations are explicit;
- reference-versus-oracle semantics are explicit;
- PDG trust limitations are explicit;
- independence output is version-bound and confidence-bearing;
- reproducibility does not claim author-independence;
- historical versioning does not rewrite state;
- contestation cannot become a vote;
- explicit non-claims are clearly normative rather than falsely presented as technical enforcement;
- the PoO/V4 scope boundary is explicit;
- the freeze and change procedure is self-describing.

Passing these conditions does not imply that PoO itself is production-ready.

It only establishes a declared epistemic boundary from which the subsequent specifications may be developed.

---

**Core principle**

> **HAHAWEEK can verify what was observed, how it was recorded, how it can be reproduced, and what provenance supports the observation. It does not claim authority over what reality must have been.**

