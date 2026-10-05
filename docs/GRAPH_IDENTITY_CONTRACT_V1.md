# HAHAWEEK — GRAPH IDENTITY CONTRACT v1

Status: VERIFIED / RECONCILED

## Purpose

Evidence Graph identity is an analytical/projection identity. It is not V4
evidence identity and it does not establish evidence authority.

## Identity domains

- Node: `HAHAWEEK-EVIDENCE-V4-GRAPH-NODE`
- Edge: `HAHAWEEK-EVIDENCE-V4-GRAPH-EDGE`

Both domains are independent from V4 evidence identity and transition
semantics.

## Canonical object

A graph node identity commits to:

- schema_version
- graph_identity_kind = NODE
- node_type
- node_id
- scope

A graph edge identity commits to:

- schema_version
- graph_identity_kind = EDGE
- from
- edge_type
- to
- scope

Object keys are recursively canonicalized in lexical order before hashing.

## Digest

`SHA-256(domain || 0x00 || canonical_object)`

The domain is part of the graph identity protocol. This is a graph-specific
identity protocol; it MUST NOT be substituted for V4 evidence identity.

## Authority boundary

Graph identity:

- is deterministic;
- is rebuildable;
- preserves graph provenance;
- does not mutate canonical evidence;
- does not advance V4 cursor/checkpoint/manifest;
- does not establish canonicality.

The executable projection exposes a fresh `rebuildEvidenceGraph(...)` boundary
which constructs a new graph from supplied authoritative evidence and formation
inputs without persistence or V4 authority access.

## Compatibility

Existing semantic graph keys remain stable. The graph identity is an
additional explicit identity field so this contract can be introduced
without rewriting historical V4 evidence identifiers.

## Acceptance criteria

- deterministic for identical inputs;
- independent of object key insertion order;
- node and edge domains are distinct;
- required identifiers reject invalid input;
- identity is not treated as V4 evidence identity;
- rebuild produces identical identities from identical authoritative inputs;
- rebuild is independent of projection order;
- rebuild does not mutate authoritative inputs;
- invalid rebuild inputs fail closed.

## Verification

Implementation:

- `src/core/evidence-graph.js` exposes the non-persistent
  `rebuildEvidenceGraph(...)` projection boundary.
- `tests/graph-identity-contract-v1.test.js` implements positive, negative,
  determinism, rebuild, projection-order, and input-mutation vectors.

Verified PR head:

- PR #723
- head `58c4f4339ea02b1240d64cae2333502af9d180a6`
- merged to main as `47693f9c30a3c0612a9b3035977a034fec4326b2`

CI/runtime evidence on the exact PR head:

- HAHAWEEK Tests: SUCCESS (run 3060)
- Security and Regression: SUCCESS (run 5298)
- A9 Runtime Verification: SUCCESS (run 200)
- HFI-MVP Runtime Verification: SUCCESS (run 149)
- HFI E5 artifact: `hfi-mvp-e2e-runtime-evidence-58c4f4339ea02b1240d64cae2333502af9d180a6`

HFI E5 verification:

- state: VERIFIED
- chain_id: 4663
- formation completeness: VALID / REQUIRED_SEQUENCE_PRESENT
- formation: VALID
- outcome coverage: COMPLETE
- criterion: PASS
- validation: CONFIRMED
- raw/canonical evidence: 8664 / 8664
- replay: equivalent=true
- publication executed: false
- V4 production authority: unchanged / INACTIVE

Therefore Graph Identity V1 satisfies the required verification boundary:

CONTRACT
→ IMPLEMENTATION
→ TEST
→ NEGATIVE TEST
→ RUNTIME VERIFICATION
→ RECONCILIATION

Graph remains a rebuildable, non-authoritative projection.
