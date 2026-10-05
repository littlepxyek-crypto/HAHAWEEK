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

- Implementation merged in PR #723 as 47693f9c30a3c0612a9b3035977a034fec4326b2 from exact head 58c4f4339ea02b1240d64cae2333502af9d180a6.
- Graph Identity positive, negative, determinism, rebuild, and input-mutation vectors passed on the PR head (HAHAWEEK Tests run #3062 / current graph implementation tree).
- HFI-MVP E5 runtime was reproduced on exact implementation-equivalent runtime head 2267fa46418fe7c9874a038bcbf91f72a790eea4; run #165 reached VERIFIED on Robinhood Mainnet chain 4663.
- Runtime evidence: 8,664 raw / 8,664 canonical evidence; Formation VALID; seven-day outcome complete; Validation CONFIRMED; replay equivalent=true; graph projection 25,337 nodes / 34,410 edges; no external publication executed.
- Current main contains the same bounded HFI runtime implementation as the verified runtime head, with main commit 610a522b03bf0f6ded08a3c6d34806ac0ef8943c.

## Verification boundary

Positive, negative, determinism, rebuild, and input-mutation vectors are
implemented in `tests/graph-identity-contract-v1.test.js`.

CI/runtime verification remains required before this contract is marked
VERIFIED / RECONCILED.
