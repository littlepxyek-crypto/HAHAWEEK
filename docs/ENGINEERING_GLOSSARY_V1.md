# HAHAWEEK Engineering Glossary v1

**Status:** Documentation baseline. This glossary defines shared terms; it does not itself authorize state transitions or change any contract.

## Core evidence terms

- **Observation** — A recorded assertion or measurement about a subject at a stated time. An observation may be incomplete, derived, or wrong; provenance and validation determine how it can be used.
- **Evidence** — A preserved input that supports or contradicts a claim under a named contract. The word does not automatically imply truth or authority.
- **Raw evidence** — Evidence preserved as acquired, with source and acquisition context. It must not be silently rewritten to fit a newer interpretation.
- **Canonical evidence** — Evidence admitted to the canonical evidence path under the applicable identity, provenance, temporal, and integrity rules.
- **Provenance** — The traceable record of what was observed, from which source, when, how it was acquired, how it was derived, and what limitations apply.
- **Canonical authority** — The contract-governed decision about which evidence/state is authoritative. Provider output, agent interpretation, a graph, report, or publication is not authority by default.
- **V4 authority** — HAHAWEEK's evidence-integrity authority chain, including segment, manifest, checkpoint, and cursor invariants. V4 integrity does not by itself establish external truth.
- **Cursor** — The persisted processing boundary. It must not advance beyond successfully processed and accepted authority.
- **Checkpoint** — A verifiable commitment to a defined evidence/processing boundary under the applicable V4 contract.
- **Manifest** — A versioned integrity record that binds the relevant segments or commitments under its contract.

## Analytical terms

- **Formation** — A temporally bounded, evidence-backed description of an observed process (for example, pool creation, liquidity addition, and first swap). It is not a prediction, recommendation, or guarantee of future outcome.
- **Formation window / cutoff** — The explicit time or block boundary used to decide which evidence may contribute to a formation. Validation must not leak evidence from after the cutoff into the formation decision.
- **Hypothesis** — A proposed explanation or relationship derived from evidence and open to testing or contradiction. It is not a validated claim.
- **Validation** — A separately governed evaluation of a hypothesis or claim against versioned rules and eligible evidence. Unavailable evidence can yield UNKNOWN or INCONCLUSIVE; it must not automatically become FAIL.
- **Research claim** — A proposition expressed in research output and traceable through interpretation to evidence and source. Publication does not make a claim canonical.
- **Descriptive measurement** — A reported metric whose meaning is limited to its documented definition. It is not automatically a ranking, predictive score, or trading signal.
- **Evidence Graph** — A deterministic, rebuildable projection that connects evidence and relationships. It is not authority and must not block Formation as a linear prerequisite.
- **Analytical projection** — A derived, rebuildable view of authoritative inputs. It can be invalidated and recomputed without rewriting canonical evidence.

## Reference Intelligence terms

- **Reference Intelligence** — A non-authoritative investigation path used to discover leads, correlate observations, enrich context, and support research. It cannot mutate V4 authority or promote its own result to canonical evidence.
- **Reference provider** — An external or controlled source accessed through an approved adapter and bounded gateway.
- **Reference Observation** — A versioned record of a provider result, preserving provider identity, source lineage where known, observation/retrieval/as-of/processing times, payload digest, completeness, derivation, limitations, and independence.
- **Source lineage** — The recorded relationship between a source and its parents, publishers, aggregators, mirrors, reposts, or derivation inputs.
- **Source independence** — A contract-governed classification of whether evidence lines are materially independent. Provider count is not source count; unknown lineage remains UNKNOWN.
- **As-of time** — The requested temporal state a query is meant to represent. A provider's current state must not be substituted for historical state without evidence that the requested temporal boundary is satisfied.

## Completeness, uncertainty, and lifecycle terms

- **Acquisition completeness** — A scoped status describing whether acquisition covered its requested temporal range sufficiently for a downstream rule to interpret absence. COMPLETE, PARTIAL, FAILED, UNKNOWN, and EXPIRED are not interchangeable.
- **UNKNOWN** — The system lacks sufficient evidence to determine a proposition. It is not FALSE.
- **INCONCLUSIVE** — Available evidence does not justify a positive or negative validation conclusion.
- **CONTRADICTED** — Preserved evidence conflicts with an observation, hypothesis, or claim; the conflict must remain visible.
- **IMPLEMENTED** — Relevant code exists in a specified revision. This does not imply tests passed or runtime behavior was verified.
- **VERIFIED** — Required checks produced recorded evidence for a specified revision, scope, and environment.
- **AUTHORIZED** — The applicable authority boundary explicitly permits the operation. Code or successful tests alone do not confer authorization.
- **ACTIVE** — The applicable activation state machine and production gate have permitted the authority to operate.
- **INACTIVE / BLOCKED** — Authority is not operating; BLOCKED additionally indicates one or more required conditions remain unmet.
- **DEFERRED WITH ACCEPTED RISK** — Work is explicitly postponed with recorded risk ownership/authorization. It must not be described as VERIFIED or fully complete.

## Normative rule

When terms conflict, the applicable versioned contract and authority state machine take precedence over this glossary. This glossary explains vocabulary; it does not override contracts.
