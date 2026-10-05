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

## Verification evidence — 2026-10-05

- Implementation merged in PR #723 as `47693f9c30a3c0612a9b3035977a034fec4326b2` from exact head `58c4f4339ea02b1240d64cae2333502af9d180a6`.
- Positive, negative, determinism, rebuild, and input-mutation vectors passed on the PR #723 implementation head.
- HFI-MVP E5 was reproduced on implementation-equivalent head `2267fa46418fe7c9874a038bcbf91f72a790eea4`; Formation `VALID`, Validation `CONFIRMED`, replay `equivalent=true`, graph projection `25,337` nodes / `34,410` edges, no external publication.
- Current main is `a266d5021a16307aef13b9d66cc973c85834cb83`; no V4 authority semantics were changed by this reconciliation.

## Verification boundary

Positive, negative, determinism, rebuild, and input-mutation vectors are
implemented in `tests/graph-identity-contract-v1.test.js`. The graph remains
projection-only and does not authorize V4 activation.
