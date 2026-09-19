# HAHAWEEK — CROSS-SPEC L4 VALIDATION CONTRACT v0.1

Status: Draft
Scope: Cross-spec validation of Graph Identity, Identity Resolution L4/L5, Source Independence, Analytical Transition, and V4 evidence authority.
Dependencies: Graph Identity Contract v0.1, Identity Resolution L4/L5 Contract v0.1, Source Independence Contract v0.1, Analytical Transition Boundary v0.1, V4 canonical/reference contracts.

## 1. PURPOSE

This contract defines the boundary for validating L4 corroboration across the analytical specifications without creating a new authority layer.

The purpose is consistency, not scoring.

The validator must answer:
1. what exact relation is being tested;
2. which evidence lines support it;
3. whether those lines are materially independent;
4. whether the temporal scope is compatible;
5. whether contradiction or a falsifier blocks corroboration;
6. whether provenance is complete enough for reconstruction;
7. whether the result may be represented as L4.

L4 remains an analytical resolution state. It is not V4 evidence authority and is not L5 verification.

## 2. AUTHORITY ORDER

The cross-spec validator MUST respect this order:

V4 evidence authority
→ verified evidence references
→ Graph Identity projection
→ source-lineage classification
→ analytical corroboration
→ Identity Resolution L4 state
→ research/report/publication derivative

The validator MUST NOT mutate raw evidence, V4 event identity, V4 transition state, manifest/checkpoint/cursor authority, canonicality, or acquisition records.

A validation failure is an analytical result only.

## 3. INPUT BOUNDARY

A future executable validator receives a canonical analytical input containing these conceptual components:
- relation definition;
- evidence references;
- source-lineage records;
- temporal scope;
- contradiction status;
- falsifier status;
- provenance completeness;
- referenced graph identities where applicable.

The exact executable schema remains OPEN until vectors freeze the field-level contract.

No implementation may silently add defaults, infer missing provenance, or convert unknown values into positive evidence.

## 4. L4 ELIGIBILITY GATE

L4 is eligible only when ALL gates pass:

### G1 — Narrow relation
The claim identifies one specific relation that can be tested. Broad claims such as “these entities are probably the same person” are not sufficient.

### G2 — Evidence validity
Every supporting evidence reference resolves to authoritative or explicitly qualified evidence. Unresolved evidence is not positive support.

### G3 — Independent lineage
At least two qualifying evidence lines have materially independent lineage under the Source Independence Contract. I0, I1, and I2 do not create independent corroboration. Repeated acquisition of the same underlying observation does not increase independence.

### G4 — Same relation
Each qualifying evidence line supports the same narrowly defined relation. Evidence supporting different relations cannot be combined merely because the entities overlap.

### G5 — Temporal compatibility
The evidence windows must overlap or otherwise satisfy the temporal condition required by the relation. Temporal separation alone does not establish independence or identity.

### G6 — No blocking contradiction
A direct unresolved contradiction concerning the same relation blocks L4. A contradiction must not be silently discarded because another source is more convenient.

### G7 — Falsifier
A concrete falsifier must be recorded. The falsifier is part of the analytical record and does not become V4 evidence authority.

### G8 — Provenance completeness
The supporting lineage and acquisition provenance must be sufficient to reconstruct why the evidence line was counted. Unknown provenance cannot be upgraded by aggregation.

## 5. RESULT STATES

The cross-spec validator MUST distinguish at least:
- L4_ELIGIBLE
- L4_BLOCKED_CONTRADICTION
- L4_BLOCKED_INSUFFICIENT_INDEPENDENCE
- L4_BLOCKED_TEMPORAL
- L4_BLOCKED_PROVENANCE
- L4_BLOCKED_RELATION_MISMATCH
- L4_UNKNOWN

The result is descriptive analytical state, not a score or confidence percentage.

## 6. IDENTITY BOUNDARY

Graph identity and V4 evidence identity remain distinct.

A graph node may reference evidence IDs. An evidence ID does not become a graph identity merely because it is referenced.

Identity Resolution L4 describes a relation between analytical entities; it does not prove real-world identity unless the relation itself is directly verified.

L5 remains governed by the Identity Resolution L4/L5 Contract and requires direct evidence appropriate to the exact relation.

## 7. ANALYTICAL TRANSITION BOUNDARY

L4 state changes may be represented by the analytical transition system.

They MUST NOT use the V4 evidence transition domain.

An analytical transition references evidence, records the analytical state change, remains rebuildable, cannot rewrite historical evidence, and cannot supersede V4 canonicality.

## 8. REORG BEHAVIOR

A V4 reorg/canonicality change may invalidate an analytical support reference.

The analytical projection MUST then be recomputed from surviving authoritative evidence and applicable transitions.

It MUST NOT rewrite or delete the historical evidence that caused the earlier analytical state.

A previously observed L4 result therefore does not grant permanent authority to evidence that later becomes non-canonical.

## 9. DUPLICATE / ACQUISITION RULE

Multiple acquisitions of the same underlying fact are not independent corroboration.

Examples: two RPC providers returning the same chain event; three dashboards reading one API; repost + original post; mirror + source article; aggregator + upstream feed.

Acquisition multiplicity may improve acquisition reliability, but it cannot by itself satisfy G3.

## 10. PUBLICATION BOUNDARY

A publication may state only the analytical relation actually supported by the validated evidence.

Publication output MUST retain provenance back to:
publication → claim → analytical validation → evidence references → source/acquisition → authoritative evidence.

L4 MUST NOT be published as an unqualified claim of real-world identity.

## 11. NEGATIVE REQUIREMENTS

The future executable vector suite MUST reject at least:
1. one qualifying lineage only;
2. two copies of one lineage;
3. repost + original;
4. mirror + source;
5. aggregator + upstream;
6. correlated feeds;
7. multiple RPC acquisitions of one event;
8. unknown lineage;
9. temporal separation without independent lineage;
10. direct contradiction;
11. relation mismatch;
12. incomplete provenance;
13. reorg-invalidated support;
14. L4 used as L5 proof.

## 12. EXECUTABLE VECTOR REQUIREMENT

Before production analytical implementation, vectors MUST cover the full cross-spec boundary.

Required vector families:
- positive independent I3/I4 corroboration;
- same-lineage duplication;
- correlated-source duplication;
- unknown lineage;
- temporal incompatibility;
- contradiction;
- falsifier;
- relation mismatch;
- incomplete provenance;
- reorg invalidation;
- acquisition multiplicity;
- Graph Identity reference;
- V4 evidence reference;
- analytical transition reference;
- L4 versus L5 boundary;
- publication provenance.

The vector suite is the executable interpretation of this contract.

## 13. PRODUCTION BOUNDARY

This contract is documentation-only.

This step MUST NOT change production ingestion, live radar, raw evidence, SQLite authority, V4 cursor/checkpoint, legacy migration, RPC behavior, production scoring, or publication automation.

Design Gate remains OPEN.

## 14. NEXT STEP

After this contract is merged:
1. add cross-spec L4 validation golden vectors;
2. execute the vectors against the frozen contracts;
3. add negative vectors for authority-boundary violations;
4. freeze the executable input/output contract;
5. only then consider an analytical validator implementation.

Core invariant:

No amount of duplicated evidence can manufacture independence, and no analytical L4 result can mutate V4 evidence authority.
