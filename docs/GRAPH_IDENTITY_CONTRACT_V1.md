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

## Verification boundary

Positive, negative, determinism, rebuild, and input-mutation vectors are
implemented in `tests/graph-identity-contract-v1.test.js`.

CI/runtime verification remains required before this contract is marked
VERIFIED / RECONCILED.

## Verification Evidence — Current Main — 2026-10-05

- Current main commit: `00a63f957a89e1754fea69f19dc2ab8985430c08`.
- Graph Identity implementation was merged by PR #723 and its positive, negative, determinism, rebuild, and input-mutation vectors were previously verified on the exact implementation head.
- HFI-MVP E5 on PR #732 exact head `e0af766c52385c01098d87702aeb1eeb06c2f92b` completed VERIFIED with raw/canonical evidence 8,664/8,664, Formation VALID, Validation CONFIRMED, replay equivalent=true, and a graph projection.
- PR #732 changed only the CI RPC endpoint and its corresponding acquisition-boundary test expectation; no V4 authority semantics changed.
- Graph identity remains deterministic, rebuildable, provenance-preserving, and projection-only. It does not authorize V4 activation.
- This reconciliation is based on the actual post-merge main commit, not the stale PR #731 baseline.